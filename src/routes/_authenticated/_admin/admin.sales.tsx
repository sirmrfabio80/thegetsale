import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HousesTab } from "@/components/admin/HousesTab";
import { SaleEventsTab } from "@/components/admin/SaleEventsTab";
import { UsersRolesTab } from "@/components/admin/UsersRolesTab";
import { SystemTab } from "@/components/admin/SystemTab";
import { SettingsTab } from "@/components/admin/SettingsTab";

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

      <Tabs defaultValue="houses" className="w-full">
        <div className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex h-auto w-max flex-nowrap rounded-none border border-border bg-transparent p-1 md:w-auto">
            <TabsTrigger
              value="houses"
              className="rounded-none px-3 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background md:px-4"
            >
              Houses
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="rounded-none px-3 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background md:px-4"
            >
              Sale events
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none px-3 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background md:px-4"
            >
              <span className="md:hidden">Users</span>
              <span className="hidden md:inline">Users &amp; roles</span>
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="rounded-none px-3 py-2 text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-foreground data-[state=active]:text-background md:px-4"
            >
              System
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="houses" className="mt-0">
          <HousesTab />
        </TabsContent>
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


