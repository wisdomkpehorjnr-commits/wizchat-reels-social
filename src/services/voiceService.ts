
import { supabase } from '@/integrations/supabase/client';

export interface VoiceCall {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'calling' | 'active' | 'ended' | 'missed';
  startedAt: Date;
  endedAt?: Date;
  duration: number;
}

export class VoiceService {
  static async initiateCall(receiverId: string): Promise<VoiceCall> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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

      return {
        id: data.id,
        callerId: data.caller_id,
        receiverId: data.receiver_id,
        status: data.status as 'calling' | 'active' | 'ended' | 'missed',
        startedAt: new Date(data.started_at),
        endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
        duration: data.duration
      };
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  static async endCall(callId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('voice_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) throw error;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  static async startRecording(): Promise<void> {
    // Placeholder for voice recording implementation
    console.log('Starting voice recording...');
  }

  static async stopRecording(): Promise<void> {
    // Placeholder for stopping voice recording
    console.log('Stopping voice recording...');
  }
}

// Export as both named export and default
export default VoiceService;
