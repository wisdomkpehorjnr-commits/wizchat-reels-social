
import { supabase } from '@/integrations/supabase/client';
import { VoiceCall } from '@/types';

export class VoiceService {
  private static peerConnection: RTCPeerConnection | null = null;
  private static localStream: MediaStream | null = null;
  private static remoteStream: MediaStream | null = null;
  private static callChannel: any = null;

  static async initializeCall(receiverId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create call record
    const { data, error } = await supabase
      .from('voice_calls')
      .insert({
        caller_id: user.id,
        receiver_id: receiverId,
        status: 'calling'
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  }

  static async startCall(callId: string): Promise<void> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        const audioElement = document.createElement('audio');
        audioElement.srcObject = this.remoteStream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      };

      // Setup real-time signaling
      this.callChannel = supabase.channel(`call-${callId}`)
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
          this.handleOffer(payload);
        })
        .on('broadcast', { event: 'answer' }, ({ payload }) => {
          this.handleAnswer(payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
          this.handleIceCandidate(payload);
        })
        .subscribe();

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.callChannel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: event.candidate
          });
        }
      };

    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  static async createOffer(callId: string): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.callChannel.send({
      type: 'broadcast',
      event: 'offer',
      payload: offer
    });
  }

  private static async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.callChannel.send({
      type: 'broadcast',
      event: 'answer',
      payload: answer
    });
  }

  private static async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  private static async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  static async endCall(callId: string): Promise<void> {
    // Update call status
    await supabase
      .from('voice_calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    // Cleanup
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.callChannel) {
      supabase.removeChannel(this.callChannel);
      this.callChannel = null;
    }

    // Remove audio elements
    document.querySelectorAll('audio').forEach(audio => audio.remove());
  }

  static async answerCall(callId: string): Promise<void> {
    await supabase
      .from('voice_calls')
      .update({ status: 'active' })
      .eq('id', callId);

    await this.startCall(callId);
  }

  static async rejectCall(callId: string): Promise<void> {
    await supabase
      .from('voice_calls')
      .update({ status: 'missed' })
      .eq('id', callId);
  }
}
