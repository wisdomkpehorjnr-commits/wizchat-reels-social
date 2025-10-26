import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

const TopicRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState<string[]>([]);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPosts(prev => [...prev, postContent.trim()]);
    setPostContent('');
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Topic Room: {roomId}</h1>

      <form onSubmit={handlePostSubmit} style={styles.form}>
        <textarea
          style={styles.textarea}
          placeholder="Write your post here..."
          value={postContent}
          onChange={e => setPostContent(e.target.value)}
          rows={4}
        />
        <button type="submit" style={styles.button}>
          Post
        </button>
      </form>

      <div style={styles.postsContainer}>
        <h2 style={styles.postsTitle}>Posts</h2>
        {posts.length === 0 && <p style={styles.noPosts}>No posts yet. Be the first!</p>}
        {posts.map((post, idx) => (
          <div key={idx} style={styles.post}>
            {post}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 600,
    margin: '20px auto',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#0b6623', // dark green text
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: '0 0 10px rgba(0,128,0,0.2)', // subtle green shadow
  },
  title: {
    marginBottom: 20,
    borderBottom: '2px solid #0b6623',
    paddingBottom: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 30,
  },
  textarea: {
    resize: 'vertical',
    padding: 10,
    fontSize: 16,
    borderRadius: 5,
    border: '2px solid #0b6623',
    color: '#0b6623',
    backgroundColor: '#e6f2e6', // very light green background
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  button: {
    backgroundColor: '#0b6623', // dark green
    color: '#fff',
    padding: '10px 20px',
    fontSize: 16,
    fontWeight: 'bold',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  postsContainer: {
    borderTop: '1px solid #0b6623',
    paddingTop: 10,
  },
  postsTitle: {
    marginBottom: 10,
  },
  noPosts: {
    fontStyle: 'italic',
    color: '#4a8c4a',
  },
  post: {
    backgroundColor: '#d9f0d9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
    color: '#0b6623',
  },
};

export default TopicRoom;
