"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import DashboardToast from "@/components/dashboard-toast";
import { auth, db } from "@/lib/firebase";
import type { AdPlacementKey, AdSize, AdsConfiguration } from "@/models/ads";

const configRef = doc(db, "ads", "config");

const defaultConfig: AdsConfiguration = {
  adStatus: "on",
  primaryAdNetwork: "admob",
  admobAppId: "",
  admobBannerAdUnitId: "",
  admobInterstitialAdUnitId: "",
  admobNativeAdUnitId: "",
  admobAppOpenAdUnitId: "",
  nativeAdsEnabled: true,
  placements: {
    bannerHome: true,
    bannerPostDetails: true,
    bannerVideo: true,
    bannerDownload: true,
    bannerSaved: true,
    interstitialPostList: true,
    interstitialPostDetails: true,
    nativePostList: true,
    nativePostDetails: true,
    nativeExitDialog: true,
    appOpenStart: true,
    appOpenResume: true,
  },
  interstitialAdInterval: 3,
  nativeAdInterval: 4,
  nativeAdStyles: {
    postList: "medium",
    videoList: "large",
    postDetails: "large",
    exitDialog: "medium",
  },
};

const placementGroups: { title: string; options: [AdPlacementKey, string][] }[] = [
  {
    title: "Banner ads",
    options: [
      ["bannerHome", "Home page"],
      ["bannerPostDetails", "Post details"],
      ["bannerVideo", "Video page"],
      ["bannerDownload", "Download page"],
      ["bannerSaved", "Saved page"],
    ],
  },
  {
    title: "Interstitial ads",
    options: [
      ["interstitialPostList", "Post list"],
      ["interstitialPostDetails", "Post details"],
    ],
  },
  {
    title: "Native ads",
    options: [
      ["nativePostList", "News, video & saved lists"],
      ["nativePostDetails", "Post details"],
      ["nativeExitDialog", "Exit dialog"],
    ],
  },
  {
    title: "App open ads",
    options: [
      ["appOpenStart", "App start"],
      ["appOpenResume", "App resume"],
    ],
  },
];

const fieldClass =
  "mt-1 h-11 w-full rounded-lg border border-[#dfe8f1] bg-white px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb] focus:ring-4 focus:ring-[#7294b8]/10";
const labelClass = "grid gap-1 text-xs font-bold text-[#536780]";

function normalizeConfig(value: Record<string, unknown>): AdsConfiguration {
  const placements = value.placements as Partial<AdsConfiguration["placements"]> | undefined;
  const nativeAdStyles = value.nativeAdStyles as Partial<AdsConfiguration["nativeAdStyles"]> | undefined;

  return {
    ...defaultConfig,
    ...value,
    adStatus: value.adStatus === "off" ? "off" : "on",
    primaryAdNetwork: "admob",
    placements: { ...defaultConfig.placements, ...placements },
    nativeAdsEnabled: value.nativeAdsEnabled !== false,
    nativeAdInterval: Math.max(1, Number(value.nativeAdInterval ?? value.nativeAdIndex) || 4),
    nativeAdStyles: { ...defaultConfig.nativeAdStyles, ...nativeAdStyles },
  } as AdsConfiguration;
}

export default function AdsDashboard() {
  const router = useRouter();
  const [form, setForm] = useState<AdsConfiguration>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const showSuccess = (message: string) => {
    setNoticeTone("success");
    setNotice(message);
  };
  const showError = (message: string) => {
    setNoticeTone("error");
    setNotice(message);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      void (async () => {
        setLoading(true);
        try {
          const snapshot = await getDoc(configRef);
          if (snapshot.exists()) setForm(normalizeConfig(snapshot.data()));
        } catch (error) {
          showError(error instanceof Error ? error.message : "Unable to load ad settings.");
        } finally {
          setLoading(false);
        }
      })();
    });
    return unsubscribe;
  }, [router]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await setDoc(configRef, { ...form, updatedAt: serverTimestamp() }, { merge: true });
      showSuccess("Ad settings saved.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to save ad settings.");
    } finally {
      setSaving(false);
    }
  };

  const setStyle = (
    key: keyof AdsConfiguration["nativeAdStyles"],
    value: AdSize,
  ) =>
    setForm((current) => ({
      ...current,
      nativeAdStyles: { ...current.nativeAdStyles, [key]: value },
    }));

  return (
    <DashboardShell>
      <form onSubmit={save}>
        <div className="mt-8 flex flex-col gap-4 md:-mt-[50px] md:min-h-[50px]">
          <div>
            <h1 className="m-0 text-[28px] leading-tight font-medium text-[#1c2c41]">
              Manage Ads
            </h1>
            <p className="mt-2 text-sm text-[#8a9bb2]">
              Configure AdMob units and where ads appear in the app.
            </p>
          </div>
        </div>
        <div className="mt-7 flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading || saving}
            type="submit"
          >
            <Save size={17} /> {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        {loading ? (
          <div className="mt-7 rounded-[18px] border border-white bg-white/85 px-6 py-16 text-center text-sm text-[#8395aa]">
            Loading ad settings...
          </div>
        ) : (
          <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
            <section className="rounded-[18px] border border-white/95 bg-white/85 px-5 py-6 shadow-[0_16px_32px_rgba(92,119,147,0.06)] sm:px-7">
              <div className="grid gap-6">
                <label className={labelClass}>
                  Ad status
                  <select
                    className={fieldClass}
                    value={form.adStatus}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adStatus: event.target.value as AdsConfiguration["adStatus"],
                      }))
                    }
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>

                <div className="grid gap-5 border-t border-[#e8eef5] pt-5">
                  <div>
                    <h2 className="m-0 text-sm font-bold text-[#273950]">Primary ads</h2>
                    <p className="mb-0 mt-1 text-xs text-[#8a9bb2]">Your active ad provider and unit identifiers.</p>
                  </div>
                  <label className={labelClass}>
                    Primary ad network
                    <select
                      className={fieldClass}
                      value="admob"
                      onChange={() => setForm((current) => ({ ...current, primaryAdNetwork: "admob" }))}
                    >
                      <option value="admob">AdMob</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    AdMob App ID
                    <input
                      className={fieldClass}
                      placeholder="ca-app-pub-...~..."
                      value={form.admobAppId}
                      onChange={(event) => setForm((current) => ({ ...current, admobAppId: event.target.value }))}
                    />
                    <span className="font-medium leading-5 text-[#8a9bb2]">
                      Add this App ID to the Android app manifest as well as saving it here.
                    </span>
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>
                      Banner ad unit ID
                      <input className={fieldClass} placeholder="ca-app-pub-.../..." value={form.admobBannerAdUnitId} onChange={(event) => setForm((current) => ({ ...current, admobBannerAdUnitId: event.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      Interstitial ad unit ID
                      <input className={fieldClass} placeholder="ca-app-pub-.../..." value={form.admobInterstitialAdUnitId} onChange={(event) => setForm((current) => ({ ...current, admobInterstitialAdUnitId: event.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      Native ad unit ID
                      <input className={fieldClass} placeholder="ca-app-pub-.../..." value={form.admobNativeAdUnitId} onChange={(event) => setForm((current) => ({ ...current, admobNativeAdUnitId: event.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      App open ad unit ID
                      <input className={fieldClass} placeholder="ca-app-pub-.../..." value={form.admobAppOpenAdUnitId} onChange={(event) => setForm((current) => ({ ...current, admobAppOpenAdUnitId: event.target.value }))} />
                    </label>
                  </div>
                </div>

                <div className="grid gap-5 border-t border-[#e8eef5] pt-5">
                  <div>
                    <h2 className="m-0 text-sm font-bold text-[#273950]">Global configuration</h2>
                    <p className="mb-0 mt-1 text-xs text-[#8a9bb2]">Control ad frequency and native ad presentation.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Interstitial ad interval
                      <input className={fieldClass} type="number" min={1} max={100} value={form.interstitialAdInterval} onChange={(event) => setForm((current) => ({ ...current, interstitialAdInterval: Math.max(1, Number(event.target.value) || 1) }))} />
                      <span className="font-medium text-[#8a9bb2]">Show after this many posts in the list.</span>
                    </label>
                    <label className={labelClass}>
                      Native ad interval
                      <input className={fieldClass} type="number" min={1} max={100} value={form.nativeAdInterval} onChange={(event) => setForm((current) => ({ ...current, nativeAdInterval: Math.max(1, Number(event.target.value) || 1) }))} />
                      <span className="font-medium text-[#8a9bb2]">Insert an ad after every N news, video, or saved items.</span>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["postList", "Native ad style: post list"],
                      ["videoList", "Native ad style: video list"],
                      ["postDetails", "Native ad style: post details"],
                      ["exitDialog", "Native ad style: exit dialog"],
                    ] as [keyof AdsConfiguration["nativeAdStyles"], string][]).map(([key, label]) => (
                      <label className={labelClass} key={key}>
                        {label}
                        <select className={fieldClass} value={form.nativeAdStyles[key]} onChange={(event) => setStyle(key, event.target.value as AdSize)}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[18px] border border-white/95 bg-white/85 px-5 py-6 shadow-[0_16px_32px_rgba(92,119,147,0.06)] sm:px-6">
              <h2 className="m-0 text-base font-semibold text-[#1c2c41]">Ad placement</h2>
              <p className="mt-1 text-xs leading-5 text-[#8a9bb2]">
                Enable or disable each format independently.
              </p>
              <div className="mt-5 grid gap-5">
                {placementGroups.map((group) => (
                  <fieldset className="m-0 grid gap-2.5 border-0 border-t border-[#e8eef5] p-0 pt-4" key={group.title}>
                    <legend className="px-0 text-xs font-bold text-[#536780]">{group.title}</legend>
                    {group.title === "Native ads" && (
                      <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[13px] font-semibold text-[#273950]">
                        <input
                          className="h-4 w-4 accent-[#237c63]"
                          type="checkbox"
                          checked={form.nativeAdsEnabled}
                          onChange={(event) => setForm((current) => ({ ...current, nativeAdsEnabled: event.target.checked }))}
                        />
                        <span>Native ads on/off</span>
                      </label>
                    )}
                    {group.options.map(([key, label]) => (
                      <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[13px] text-[#40546d]" key={key}>
                        <input
                          className="h-4 w-4 accent-[#237c63]"
                          type="checkbox"
                          checked={form.placements[key]}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              placements: { ...current.placements, [key]: event.target.checked },
                            }))
                          }
                        />
                        <span>{label}</span>
                        {form.placements[key] && <Check className="ml-auto text-[#32815f]" size={14} />}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </aside>
          </div>
        )}
      </form>

      <section className="mt-5 rounded-[18px] border border-white/95 bg-white/70 px-5 py-5 text-sm text-[#536780]">
        <h2 className="m-0 text-sm font-bold text-[#273950]">AdMob setup</h2>
        <p className="mb-0 mt-2 max-w-3xl text-xs leading-5 text-[#7d8fa5]">
          Use the App ID and ad unit IDs from your AdMob account. The App ID must also be configured in the Android application; placement switches and unit IDs saved here are the values available to the app.
        </p>
      </section>

      {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}
    </DashboardShell>
  );
}
