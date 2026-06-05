import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { useMachines } from "@/lib/oee-data";
import {
  listUsers, saveUser, deleteUser,
  type UserRole, type UserRow,
} from "@/lib/sheets.functions";
import { RequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users · OEE Control" }] }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <UsersAdmin />
    </RequireRole>
  ),
});

const usersKey = ["sheets", "users"] as const;
const ROLES: UserRole[] = ["operator", "supervisor", "manager", "admin"];

type Form = {
  original_id?: string;
  employee_id: string;
  name: string;
  password: string;
  role: UserRole;
  default_machine_id: string;
};
const empty: Form = {
  employee_id: "", name: "", password: "", role: "operator", default_machine_id: "",
};

function UsersAdmin() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: usersKey,
    queryFn: () => listUsers() as Promise<UserRow[]>,
  });
  const { data: machines = [] } = useMachines();

  const upsert = useMutation({
    mutationFn: (f: Form) => saveUser({ data: f }),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
  const del = useMutation({
    mutationFn: (employee_id: string) => deleteUser({ data: { employee_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (u: UserRow) => {
    setForm({
      original_id: u.employee_id,
      employee_id: u.employee_id,
      name: u.name,
      password: "",
      role: u.role,
      default_machine_id: u.default_machine_id,
    });
    setOpen(true);
  };
  const save = () => {
    if (!form.employee_id || !form.role) {
      toast.error("Employee ID and Role are required");
      return;
    }
    upsert.mutate(form, {
      onSuccess: () => { setOpen(false); toast.success(form.original_id ? "User updated" : "User added"); },
      onError: (e) => toast.error(e.message),
    });
  };
  const remove = (id: string) => {
    if (!confirm(`Delete user ${id}?`)) return;
    del.mutate(id, {
      onSuccess: () => toast.success("User deleted"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <TopBar
        title="User Management"
        subtitle="Operators, supervisors, managers and admins"
        right={
          <button onClick={startNew} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" /> Add User
          </button>
        }
      />
      <div className="p-6">
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-5 py-3">Employee ID</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Default Machine</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.employee_id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium">{u.employee_id}</td>
                  <td className="px-5 py-3">{u.name}</td>
                  <td className="px-5 py-3 capitalize">{u.role}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.default_machine_id || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(u)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                    <button onClick={() => remove(u.employee_id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No users</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{form.original_id ? "Edit User" : "New User"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Employee ID">
                <input className="input" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP001" />
              </Field>
              <Field label="Name">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={form.original_id ? "Password (leave blank to keep)" : "Password"}>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Default Machine (optional, operators)">
                <select className="input" value={form.default_machine_id} onChange={(e) => setForm({ ...form, default_machine_id: e.target.value })}>
                  <option value="">— None —</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_name} ({m.machine_code})</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={save} disabled={upsert.isPending} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
                {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:6px;padding:8px 10px;font-size:14px;color:var(--color-foreground)}.input:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
