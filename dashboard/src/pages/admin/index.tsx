import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { Shield } from 'lucide-react';
import AdminToolsTab from './AdminToolsTab';
import AdminUsersTab from './AdminUsersTab';

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground text-center">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Administrative actions and exports.</p>
      </div>

      <Tabs defaultValue="users" className="flex-1">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <AdminUsersTab />
        </TabsContent>
        <TabsContent value="tools" className="mt-4">
          <AdminToolsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
