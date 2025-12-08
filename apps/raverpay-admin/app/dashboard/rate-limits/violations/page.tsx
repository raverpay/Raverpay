'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, AlertTriangle } from 'lucide-react';

interface Violation {
  id: string;
  userId: string | null;
  ip: string;
  endpoint: string;
  method: string;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  limit: number;
  hitCount: number;
  violatedAt: string;
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEndpoint, setFilterEndpoint] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchViolations();
  }, [page, filterEndpoint, filterCountry]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (filterEndpoint !== 'all') params.append('endpoint', filterEndpoint);
      if (filterCountry !== 'all') params.append('country', filterCountry);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/admin/rate-limits/violations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setViolations(data.violations);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchViolations();
  };

  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'Endpoint',
      'Method',
      'IP',
      'Country',
      'City',
      'User ID',
      'Limit',
      'Hit Count',
    ];
    const rows = violations.map((v) => [
      new Date(v.violatedAt).toISOString(),
      v.endpoint,
      v.method,
      v.ip,
      v.country || '',
      v.city || '',
      v.userId || '',
      v.limit,
      v.hitCount,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rate-limit-violations-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Violation Logs</h1>
          <p className="text-muted-foreground">Detailed rate limit violation history</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex gap-2 md:col-span-2">
              <Input
                placeholder="Search IP, endpoint, user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Select value={filterEndpoint} onValueChange={setFilterEndpoint}>
              <SelectTrigger>
                <SelectValue placeholder="All Endpoints" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Endpoints</SelectItem>
                <SelectItem value="/api/auth/login">Login</SelectItem>
                <SelectItem value="/api/auth/register">Register</SelectItem>
                <SelectItem value="/api/transactions/fund/card">Card Funding</SelectItem>
                <SelectItem value="/api/transactions/withdraw">Withdraw</SelectItem>
                <SelectItem value="/api/vtu/airtime">Airtime</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
                <SelectItem value="Ghana">Ghana</SelectItem>
                <SelectItem value="Kenya">Kenya</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : violations.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
              <p className="mt-2 text-muted-foreground">No violations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Endpoint</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">IP Address</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {violations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        {new Date(violation.violatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {violation.method}
                          </Badge>
                          <code className="text-xs">{violation.endpoint}</code>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs">{violation.ip}</code>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {violation.country ? (
                          <span>
                            {violation.city}, {violation.country}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {violation.userId ? (
                          <code className="text-xs">{violation.userId.slice(0, 8)}...</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="destructive" className="text-xs">
                          {violation.limit}/{violation.hitCount}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
