
import Layout from '@/components/Layout';
import UserSearch from '@/components/UserSearch';

const Friends = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Friends</h1>
          <p className="text-muted-foreground">Connect with friends and discover new people</p>
        </div>
        
        <UserSearch />
      </div>
    </Layout>
  );
};

export default Friends;
