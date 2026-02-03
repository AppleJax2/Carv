'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import useSWR from 'swr';
import { Suspense, useState } from 'react';
import { 
  User, 
  Key, 
  Download, 
  ShoppingBag, 
  Settings, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Crown,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UserData {
  id: number;
  name: string | null;
  email: string;
  subscriptionTier: string;
  createdAt: string;
}

interface LicenseData {
  id: number;
  licenseKey: string;
  productId: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface PurchaseData {
  id: number;
  productId: string;
  productName: string;
  amount: string;
  purchasedAt: string;
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 bg-secondary rounded-xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-48 bg-secondary rounded-xl" />
        <div className="h-48 bg-secondary rounded-xl" />
      </div>
    </div>
  );
}

function AccountOverview() {
  const { data: user } = useSWR<UserData>('/api/user', fetcher);
  
  const isPro = user?.subscriptionTier === 'pro';
  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/50 border-border">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {user?.name || 'Carv User'}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                    <Crown className="h-3 w-3" />
                    Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-secondary text-muted-foreground rounded-full">
                    Free
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '...'}
                </span>
              </div>
            </div>
          </div>
          
          {!isPro && (
            <Link href="/pricing">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Pro
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LicenseKeys() {
  const { data: licenses } = useSWR<LicenseData[]>('/api/user/licenses', fetcher);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = (key: string, id: number) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-primary" />
          License Keys
        </CardTitle>
        <CardDescription>
          Your active license keys for Carv products
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!licenses || licenses.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No license keys yet</p>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                Get Pro License
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {licenses.map((license) => (
              <div 
                key={license.id}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {license.productId.replace('_', ' ')}
                  </p>
                  <code className="text-xs text-muted-foreground font-mono">
                    {license.licenseKey}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  {license.isActive ? (
                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive rounded">
                      Inactive
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(license.licenseKey, license.id)}
                  >
                    {copiedId === license.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PurchaseHistory() {
  const { data: purchases } = useSWR<PurchaseData[]>('/api/user/purchases', fetcher);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Purchase History
        </CardTitle>
        <CardDescription>
          Your past purchases and transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!purchases || purchases.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div 
                key={purchase.id}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {purchase.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(purchase.purchasedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  ${parseFloat(purchase.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/download">
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Download App
            </Button>
          </Link>
          <Link href="/changelog">
            <Button variant="outline" className="w-full justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Changelog
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </Link>
          <a href="https://github.com/AppleJax2/Carv/issues" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Support
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <section className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">Dashboard</h1>
      
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="space-y-6">
          <AccountOverview />
          
          <div className="grid md:grid-cols-2 gap-6">
            <LicenseKeys />
            <PurchaseHistory />
          </div>
          
          <QuickActions />
        </div>
      </Suspense>
    </section>
  );
}
