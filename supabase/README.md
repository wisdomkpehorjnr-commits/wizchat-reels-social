Create_group_with_members SQL

This folder contains database helpers for Supabase.

1) Run the SQL function to add server-side helper:

- Open Supabase dashboard for your project
- Go to SQL Editor
- Paste the contents of `create_group_with_members.sql` and run

2) Verify function by running:

```sql
select * from public.create_group_with_members('Test Group', array['<member-uuid-1>','<member-uuid-2>']);
```

3) After adding the function, the client-side `CreateGroupDialog` will attempt to call this RPC first. If the RPC exists, it will create the group, insert members, and create a chat atomically under `security definer`.

Notes:
- Ensure the role used by your Supabase auth has privileges or trust for `security definer` operations.
- If you prefer to manage migrations, add this SQL to your migration pipeline instead of running it manually.
