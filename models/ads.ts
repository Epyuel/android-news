export type AdSize = "small" | "medium" | "large";

export type AdPlacementKey =
  | "bannerHome"
  | "bannerPostDetails"
  | "bannerVideo"
  | "bannerDownload"
  | "bannerSaved"
  | "interstitialPostList"
  | "interstitialPostDetails"
  | "nativePostList"
  | "nativePostDetails"
  | "nativeExitDialog"
  | "appOpenStart"
  | "appOpenResume";

export interface AdsConfiguration {
  adStatus: "on" | "off";
  primaryAdNetwork: "admob";
  admobAppId: string;
  admobBannerAdUnitId: string;
  admobInterstitialAdUnitId: string;
  admobNativeAdUnitId: string;
  admobAppOpenAdUnitId: string;
  nativeAdsEnabled: boolean;
  placements: Record<AdPlacementKey, boolean>;
  interstitialAdInterval: number;
  nativeAdInterval: number;
  nativeAdStyles: {
    postList: AdSize;
    videoList: AdSize;
    postDetails: AdSize;
    exitDialog: AdSize;
  };
  updatedAt?: string;
}
