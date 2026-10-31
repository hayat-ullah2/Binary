"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import { AdminFrame } from "@/components/admin/admin-frame";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  quotexAccountId: string | null;
  approvalStatus: string;
  createdAt: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function fetchUsers(): Promise<UserSummary[]> {
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  const data = (await response.json()) as {
    users?: UserSummary[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load users");
  }
  if (!Array.isArray(data.users)) {
    throw new Error("The server returned an invalid user list");
  }
  return data.users;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await fetchUsers());
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((caught: unknown) => {
        if (active) setError(getErrorMessage(caught, "Unable to load users"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function setApprovalStatus(
    userId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    setUpdatingId(userId);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = (await response.json()) as {
        user?: Pick<UserSummary, "id" | "approvalStatus" | "quotexAccountId">;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update user approval");
      }
      if (!data.user) {
        throw new Error("The server returned an invalid approval response");
      }
      const approvalStatus = data.user.approvalStatus;
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? { ...user, approvalStatus }
            : user
        )
      );
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to update user approval"));
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingCount = users.filter(
    (user) => user.approvalStatus === "PENDING"
  ).length;

  return (
    <AdminFrame>
      <div className="space-y-6">
        <PageHeader
          title="User approvals"
          description="Review new registrations and approve access to the trading dashboard."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                setError(null);
                void loadUsers();
              }}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-warning-muted text-warning">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
                <p className="text-xl font-semibold tabular-nums">
                  {pendingCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Total accounts</p>
                <p className="text-xl font-semibold tabular-nums">
                  {users.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <p
            className="rounded-lg border border-negative/30 bg-negative-muted px-4 py-3 text-sm text-negative"
            role="alert"
          >
            {error}
          </p>
        )}

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Quotex Account ID / UID</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      <LoaderCircle className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      No registered users yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {user.quotexAccountId ?? "Not submitted"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.approvalStatus === "APPROVED"
                              ? "positive"
                              : user.approvalStatus === "REJECTED"
                                ? "negative"
                                : "warning"
                          }
                        >
                          {user.approvalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {user.approvalStatus !== "APPROVED" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                void setApprovalStatus(user.id, "APPROVED")
                              }
                              disabled={
                                updatingId === user.id || !user.quotexAccountId
                              }
                              title={
                                user.quotexAccountId
                                  ? "Approve dashboard access"
                                  : "User must submit a Quotex Account ID / UID first"
                              }
                            >
                              {updatingId === user.id ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                              Approve
                            </Button>
                          )}
                          {user.approvalStatus !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void setApprovalStatus(user.id, "REJECTED")
                              }
                              disabled={updatingId === user.id}
                            >
                              <X className="size-4" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminFrame>
  );
}
