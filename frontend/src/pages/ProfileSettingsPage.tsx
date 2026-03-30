import { useState } from 'react';
import { useAccount } from '../context/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { User, Mail, Link as LinkIcon, Copy, Check, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import WalletSummary from '../components/WalletSummary';

export default function ProfileSettingsPage() {
  const { account, updateDisplayName, updateEmail, getReferralLink } = useAccount();
  const [displayName, setDisplayName] = useState(account?.displayName || '');
  const [email, setEmail] = useState(account?.email || '');
  const [copied, setCopied] = useState(false);

  if (!account) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">No Account Found</h2>
        <p className="text-amber-200/70">Please create an account to access settings.</p>
      </div>
    );
  }

  const handleSaveDisplayName = () => {
    if (displayName.trim() && displayName !== account.displayName) {
      updateDisplayName(displayName.trim());
      toast.success('Display name updated successfully!');
    }
  };

  const handleSaveEmail = () => {
    if (email.trim() !== account.email) {
      updateEmail(email.trim());
      toast.success('Email updated successfully!');
    }
  };

  const handleCopyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">Profile Settings</h1>
        <p className="text-xl text-amber-200/80">
          Manage your account information and preferences
        </p>
      </div>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Economy Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletSummary variant="panel" showResources={true} />
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <User className="w-6 h-6" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-amber-300">Account ID</Label>
            <div className="bg-slate-900/60 border border-amber-500/20 rounded-lg p-3">
              <code className="text-amber-200/70 text-sm font-mono break-all">
                {account.accountId}
              </code>
            </div>
            <p className="text-xs text-amber-200/50">
              Your unique account identifier
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300">Account Created</Label>
            <div className="text-amber-200/70">
              {formatDate(account.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <User className="w-6 h-6" />
            Display Name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-amber-300">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-slate-900 border-amber-500/30 text-amber-100 placeholder:text-amber-200/40"
            />
          </div>
          <Button
            onClick={handleSaveDisplayName}
            disabled={!displayName.trim() || displayName === account.displayName}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
          >
            Save Display Name
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-amber-300">
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-slate-900 border-amber-500/30 text-amber-100 placeholder:text-amber-200/40"
            />
            <p className="text-xs text-amber-200/50">
              For future updates and account recovery
            </p>
          </div>
          <Button
            onClick={handleSaveEmail}
            disabled={email.trim() === account.email}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
          >
            Save Email
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <LinkIcon className="w-6 h-6" />
            Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-amber-300">Your Referral Link</Label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900/60 border border-amber-500/20 rounded-lg p-3">
                <code className="text-amber-200/70 text-sm font-mono break-all">
                  {getReferralLink()}
                </code>
              </div>
              <Button
                onClick={handleCopyReferralLink}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-200/50">
              Share this link to invite friends to Mythereum
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
