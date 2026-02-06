import { supabaseServer } from '../../lib/supabase/server';
import type { Database } from '../../lib/supabase/database.types';

type Artist = Database['public']['Tables']['artists']['Row'];
type Campaign = Database['public']['Tables']['campaigns']['Row'];
type Release = Database['public']['Tables']['releases']['Row'];
type PricingPlan = Database['public']['Tables']['pricing_plans']['Row'];
type DistributionJob = Database['public']['Tables']['distribution_jobs']['Row'];

const CHANNELS = [
  'Spotify',
  'Apple Music',
  'YouTube Music',
  'TikTok',
  'Amazon Music',
  'Deezer',
  'TIDAL',
  'Pandora',
  'Facebook',
  'Instagram',
  'Twitter/X',
] as const;

const statusColor: Record<string, string> = {
  live: 'text-emerald-300',
  running: 'text-emerald-300',
  active: 'text-emerald-300',
  queued: 'text-amber-300',
  pending: 'text-amber-300',
  processing: 'text-amber-300',
  paused: 'text-rose-300',
  blocked: 'text-rose-300',
  error: 'text-rose-300',
};

function moneyFromCents(value?: number | null) {
  if (!value) return '$0.00';
  return `$${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toTitle(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeChannel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default async function Dashboard() {
  const sb = supabaseServer();

  const { data: artists, error: artistsErr } = await sb
    .from('artists')
    .select('id,stage_name,created_at')
    .order('created_at', { ascending: false })
    .limit(25)
    .returns<Artist[]>();

  const { data: campaigns, error: campaignsErr } = await sb
    .from('campaigns')
    .select('id,name,objective,status,budget_cents,created_at,artist_id')
    .order('created_at', { ascending: false })
    .limit(25)
    .returns<Campaign[]>();

  const { data: releases, error: releasesErr } = await sb
    .from('releases')
    .select('id,title,status,release_date,created_at,artist_id,metadata')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Release[]>();

  const { data: pricingPlans, error: pricingErr } = await sb
    .from('pricing_plans')
    .select('id,name,monthly_cents,features,active,updated_at')
    .order('monthly_cents', { ascending: true })
    .returns<PricingPlan[]>();

  const { data: distributionJobs, error: jobsErr } = await sb
    .from('distribution_jobs')
    .select('id,status,targets,created_at,artist_id,release_id')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<DistributionJob[]>();

  const artistNameById = new Map((artists ?? []).map((artist) => [artist.id, artist.stage_name]));
  const releaseById = new Map((releases ?? []).map((release) => [release.id, release]));

  const runningCampaigns = (campaigns ?? []).filter((campaign) => campaign.status === 'running').length;
  const queuedJobs = (distributionJobs ?? []).filter((job) => ['queued', 'pending', 'processing'].includes(job.status)).length;
  const totalCampaignBudget = (campaigns ?? []).reduce((sum, campaign) => sum + (campaign.budget_cents || 0), 0);

  const channelLiveCount: Record<string, number> = Object.fromEntries(CHANNELS.map((channel) => [channel, 0]));

  for (const job of distributionJobs ?? []) {
    if (!['live', 'completed', 'success', 'published'].includes(job.status)) continue;
    const targets = Array.isArray(job.targets) ? job.targets : [];
    for (const target of targets) {
      if (typeof target !== 'string') continue;
      const normalized = normalizeChannel(target);
      for (const known of CHANNELS) {
        if (normalizeChannel(known) === normalized || normalizeChannel(known).includes(normalized) || normalized.includes(normalizeChannel(known))) {
          channelLiveCount[known] += 1;
          break;
        }
      }
    }
  }

  const totalChannelsLive = Object.values(channelLiveCount).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 shadow-[0_0_35px_rgba(11,61,145,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">DMF Records • Fly Hoolie Ent</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Command Center Dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">
              Supabase-only operations hub for roster, pricing, campaigns, and full DSP plus social distribution.
            </p>
          </div>
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 px-4 py-3 text-sm">
            <div className="font-semibold text-blue-200">Da&apos;Riyah Ops Brain</div>
            <div className="text-slate-300">Google AI Studio + Koveable campaign stack</div>
            <div className="text-slate-400">Built for educated strategic execution</div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Roster Size" value={`${artists?.length ?? 0}`} detail="Active artist roster" />
        <MetricCard label="Live Channels" value={`${totalChannelsLive}/${CHANNELS.length}`} detail="DSP + Social coverage" />
        <MetricCard label="Campaigns Running" value={`${runningCampaigns}`} detail={`${campaigns?.length ?? 0} total campaigns`} />
        <MetricCard label="Campaign Budget" value={moneyFromCents(totalCampaignBudget)} detail={`${queuedJobs} distro jobs in queue`} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:col-span-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Roster</h2>
          {artistsErr ? (
            <p className="mt-3 text-sm text-rose-300">{artistsErr.message}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(artists ?? []).slice(0, 12).map((artist) => (
                <div key={artist.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <span className="text-sm text-slate-100">{artist.stage_name}</span>
                  <span className="text-xs text-slate-400">{new Date(artist.created_at).toLocaleDateString()}</span>
                </div>
              ))}
              {(!artists || artists.length === 0) && <p className="text-sm text-slate-500">No artists found in Supabase.</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:col-span-7">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Channel Coverage Matrix</h2>
          <p className="mt-1 text-xs text-slate-400">Every DSP plus Facebook, Instagram, and Twitter/X in one view.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((channel) => {
              const liveCount = channelLiveCount[channel] || 0;
              return (
                <div
                  key={channel}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-100">{channel}</div>
                  <div className={`text-xs ${liveCount > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {liveCount > 0 ? `${liveCount} live release target${liveCount > 1 ? 's' : ''}` : 'Awaiting live targets'}
                  </div>
                </div>
              );
            })}
          </div>
          {(jobsErr || releasesErr) && (
            <p className="mt-3 text-xs text-rose-300">
              {jobsErr?.message || releasesErr?.message}
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:col-span-7">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Music Campaign Operations</h2>
          {campaignsErr ? (
            <p className="mt-3 text-sm text-rose-300">{campaignsErr.message}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(campaigns ?? []).slice(0, 10).map((campaign) => (
                <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{campaign.name}</div>
                    <div className="text-xs text-slate-400">
                      {toTitle(campaign.objective)} • Artist: {artistNameById.get(campaign.artist_id) ?? 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold uppercase ${statusColor[campaign.status] ?? 'text-slate-300'}`}>
                      {toTitle(campaign.status)}
                    </div>
                    <div className="text-sm text-gold">{moneyFromCents(campaign.budget_cents)}</div>
                  </div>
                </div>
              ))}
              {(!campaigns || campaigns.length === 0) && <p className="text-sm text-slate-500">No campaigns found in Supabase.</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 xl:col-span-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Pricing & Inventory</h2>
          {pricingErr ? (
            <p className="mt-3 text-sm text-rose-300">{pricingErr.message}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(pricingPlans ?? []).map((plan) => (
                <div key={plan.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{plan.name}</span>
                    <span className="text-sm text-gold">{moneyFromCents(plan.monthly_cents)}/mo</span>
                  </div>
                  <div className={`text-xs ${plan.active ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {plan.active ? 'Active pricing plan' : 'Inactive plan'}
                  </div>
                </div>
              ))}
              {(!pricingPlans || pricingPlans.length === 0) && (
                <p className="text-sm text-slate-500">No pricing plans found in Supabase.</p>
              )}
            </div>
          )}
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.14em] text-amber-200">Import Queue</div>
            <div className="mt-1 text-sm text-slate-100">Big Homie Cash InventoryExport 2025 10 07 21 15 37</div>
            <div className="text-xs text-amber-200">Awaiting source file in workspace for ingest.</div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-white/10 bg-slate-900/70 p-4">
        <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Distribution Jobs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="px-2 py-2">Release</th>
                <th className="px-2 py-2">Artist</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Targets</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {(distributionJobs ?? []).slice(0, 12).map((job) => {
                const release = job.release_id ? releaseById.get(job.release_id) : null;
                const artistName = artistNameById.get(job.artist_id) ?? 'Unknown';
                const targets = Array.isArray(job.targets) ? job.targets.filter((v): v is string => typeof v === 'string') : [];
                return (
                  <tr key={job.id} className="border-b border-white/5 text-slate-200">
                    <td className="px-2 py-2">{release?.title ?? 'Unmapped Release'}</td>
                    <td className="px-2 py-2">{artistName}</td>
                    <td className={`px-2 py-2 ${statusColor[job.status] ?? 'text-slate-200'}`}>{toTitle(job.status)}</td>
                    <td className="px-2 py-2 text-slate-300">{targets.length ? targets.join(', ') : 'No targets'}</td>
                    <td className="px-2 py-2 text-slate-400">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!distributionJobs || distributionJobs.length === 0) && <p className="mt-3 text-sm text-slate-500">No distribution jobs found in Supabase.</p>}
      </section>
    </main>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}
