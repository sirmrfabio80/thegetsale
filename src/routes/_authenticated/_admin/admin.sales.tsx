import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleEventsTab } from "@/components/admin/SaleEventsTab";
import { UsersRolesTab } from "@/components/admin/UsersRolesTab";
import { SystemTab } from "@/components/admin/SystemTab";

export const Route = createFileRoute("/_authenticated/_admin/admin/sales")({
  head: () => ({
    meta: [{ title: "Admin · Sales — The Get" }],
  }),
  component: AdminSalesPage,
});

function AdminSalesPage() {
  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          Sale management.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Add, edit, publish and hide sale events. Curate the people who can see this room.
        </p>
      </section>

      <SectionRule />

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="mb-6 h-auto rounded-none border border-border bg-transparent p-1">
          <TabsTrigger
            value="sales"
            className="rounded-none px-4 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Sale events
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-none px-4 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Users & roles
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="rounded-none px-4 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-0">
          <SaleEventsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersRolesTab />
        </TabsContent>
        <TabsContent value="system" className="mt-0">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

