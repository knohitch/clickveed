import { MagicClipsGenerator } from '@/components/magic-clips-generator';
import { FeatureLock } from '@/components/feature-lock';
import { getFeaturePageAccess } from '@/lib/server-feature-page';

export default async function MagicClipsPage() {
    const access = await getFeaturePageAccess('magic-clips');

    if (!access.canAccess) {
        return (
            <FeatureLock
                featureId="magic-clips"
                planName={access.planName}
                featureTier={access.featureTier}
                planFeatures={access.planFeatures}
                title="Feature Not Available"
                description="This feature is not included in your current plan."
            />
        );
    }

    return <MagicClipsGenerator />;
}
