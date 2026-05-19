import { redirect } from "next/navigation";
import { Users, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CAN_MANAGE_USERS, hasRole } from "@/lib/roles";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  MotionPage,
  MotionStagger,
  MotionItem,
} from "@/components/ui/MotionPage";
import { StatCard } from "@/components/ui/StatCard";
import { UserTable } from "./UserTable";

export default async function UsersPage() {
  const session = await auth();
  if (!hasRole(session?.user.role, CAN_MANAGE_USERS)) {
    redirect("/dashboard");
  }
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  // Strip password from users before passing to client
  const safeUsers = users.map(u => {
    const { hashedPassword, ...safe } = u;
    return safe as any; // Cast back to match interface Omit<User, 'hashedPassword'>
  });

  const counts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <MotionPage>
      <PageHeader
        title="User Management"
        subtitle="Manage employees and their access roles."
      />

      <MotionStagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MotionItem>
          <StatCard
            value={users.length}
            label="Employees"
            hint="Total users on platform"
            icon={<Users size={18} />}
            iconTone="brand"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            value={(counts.SUPERADMIN ?? 0) + (counts.ADMIN ?? 0)}
            label="Administrators"
            hint="Platform management access"
            icon={<ShieldCheck size={18} />}
            iconTone="purple"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            value={(counts.QC_INSPECTOR ?? 0) + (counts.OPERATOR ?? 0)}
            label="Production Team"
            hint="Operators & QC inspectors"
            icon={<Users size={18} />}
            iconTone="success"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            value={counts.REVIEWER ?? 0}
            label="Reviewers"
            hint="Artwork approval power"
            icon={<Users size={18} />}
            iconTone="warning"
          />
        </MotionItem>
      </MotionStagger>

      <Card>
        <UserTable 
          users={safeUsers} 
          currentUserRole={session?.user.role as string}
          currentUserEmail={session?.user.email ?? ""}
        />
      </Card>
    </MotionPage>
  );
}
