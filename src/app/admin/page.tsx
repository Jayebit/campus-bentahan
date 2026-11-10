"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Package, MessageSquare, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { supabase, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalListings: number;
    pendingReports: number;
    activeTransactions: number;
  } | null>(null);
  const [recentUsers, setRecentUsers] = useState<{
    id: string;
    display_name: string | null;
    email: string;
    role: string;
    is_verified: boolean;
    created_at: string;
  }[]>([]);
  const [recentReports, setRecentReports] = useState<{
    id: string;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    created_at: string;
    reporter: { display_name: string | null; email: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || user.role !== "admin") return;

      setLoading(true);
      try {
        // Fetch stats
        const [
          { count: totalUsers },
          { count: totalListings },
          { count: pendingReports },
          { count: activeTransactions },
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("listings").select("*", { count: "exact", head: true }),
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
          supabase.from("transactions").select("*", { count: "exact", head: true }).in("status", ["PENDING", "RESERVED", "SCHEDULED", "IN_PROGRESS"]),
        ]);

        setStats({
          totalUsers: totalUsers || 0,
          totalListings: totalListings || 0,
          pendingReports: pendingReports || 0,
          activeTransactions: activeTransactions || 0,
        });

        // Fetch recent users
        const { data: usersData } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentUsers(usersData || []);

        // Fetch recent reports
        const { data: reportsData } = await supabase
          .from("reports")
          .select("*, reporter:users!reporter_id(display_name, email), target_type, target_id, reason, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentReports(reportsData || []);
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase, user, toast]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of Campus Bentahan platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalListings || 0}</div>
            <p className="text-xs text-muted-foreground">Active & inactive listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.pendingReports || 0}</div>
            <p className="text-xs text-muted-foreground">Reports awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">In-progress transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-muted-foreground">No reports yet.</p>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant={report.status === "PENDING" ? "destructive" : report.status === "REVIEWING" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{report.target_type}: {report.target_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Reported by {report.reporter?.display_name || report.reporter?.email} &mdash; {formatDate(report.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{report.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-medium">{u.display_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{u.display_name || u.email}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === "admin" ? "default" : u.role === "faculty" ? "secondary" : "outline"}>
                      {u.role}
                    </Badge>
                    <Badge variant={u.is_verified ? "secondary" : "outline"}>
                      {u.is_verified ? "Verified" : "Pending"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}