import type { ModelJobContract, ModelLane, PrivacyMode, SourceSensitivity } from "./types";

export type RouterEnvironment = {
  privacyMode: PrivacyMode;
  sensitivity: SourceSensitivity;
  deterministicAvailable: boolean;
  localModelAvailable: boolean;
  frontierModelAvailable: boolean;
  preferredLane?: ModelLane;
};

export type ModelRoute =
  | {
      ok: true;
      lane: ModelLane;
      redactionPolicy: ModelJobContract["redactionPolicy"];
      reason: string;
    }
  | {
      ok: false;
      reason: string;
      blockedLanes: ModelLane[];
    };

function laneAvailable(lane: ModelLane, env: RouterEnvironment) {
  if (lane === "deterministic") return env.deterministicAvailable;
  if (lane === "local") return env.localModelAvailable;
  return env.frontierModelAvailable;
}

function privacyAllowed(lane: ModelLane, env: RouterEnvironment) {
  if (env.privacyMode === "local_only") return lane !== "frontier";
  if (env.privacyMode === "hybrid") return true;
  return true;
}

function laneRank(lane: ModelLane) {
  if (lane === "deterministic") return 0;
  if (lane === "local") return 1;
  return 2;
}

export function routeModelJob(
  contract: ModelJobContract,
  env: RouterEnvironment,
): ModelRoute {
  const preferred = env.preferredLane && contract.allowedLanes.includes(env.preferredLane)
    ? [env.preferredLane]
    : [];
  const candidates = Array.from(new Set([...preferred, ...contract.allowedLanes])).sort(
    (left, right) => laneRank(left) - laneRank(right),
  );
  const blockedLanes: ModelLane[] = [];

  for (const lane of candidates) {
    if (!privacyAllowed(lane, env)) {
      blockedLanes.push(lane);
      continue;
    }
    if (!laneAvailable(lane, env)) {
      blockedLanes.push(lane);
      continue;
    }
    return {
      ok: true,
      lane,
      redactionPolicy: lane === "frontier" ? contract.redactionPolicy : "none",
      reason:
        lane === "frontier"
          ? "frontier lane allowed by privacy mode and contract"
          : `${lane} lane selected by contract and availability`,
    };
  }

  return {
    ok: false,
    reason:
      env.privacyMode === "local_only" && contract.allowedLanes.includes("frontier")
        ? "privacy mode local_only blocks frontier lane and no permitted local/deterministic lane is available"
        : "no contract-allowed model lane is currently available",
    blockedLanes,
  };
}

