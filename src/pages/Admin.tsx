
import Layout from '@/components/Layout';
import LogoManager from '@/components/LogoManager';

const Admin = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage site settings and configuration</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LogoManager />
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
