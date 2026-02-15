// Test feature matching logic
const FEATURE_CONFIG = {
  'ai-assistant': { displayName: 'AI Assistant', category: 'content' },
  'creative-assistant': { displayName: 'Creative Assistant', category: 'content' },
  'social-integrations': { displayName: 'Social Integrations', category: 'social' },
  'media-library': { displayName: 'Media Library', category: 'media' },
  'profile-settings': { displayName: 'Profile Settings', category: 'settings' },
};

function getFeatureDisplayName(featureId) {
  return FEATURE_CONFIG[featureId]?.displayName || featureId;
}

const FEATURE_KEYWORD_MAP = {
  'video-suite': ['video', 'editing', 'creation'],
  'ai-assistant': ['ai', 'assistant', 'chat'],
  'voice-cloning': ['voice', 'clone', 'cloning'],
  'background-remover': ['background', 'remove', 'remover'],
  'social-analytics': ['social', 'analytics', 'insights'],
  'social-scheduler': ['social', 'schedule', 'scheduling'],
  'magic-clips': ['magic', 'clips', 'highlights'],
  'script-generator': ['script', 'generator', 'writing'],
  'voice-over': ['voice', 'over', 'voiceover', 'narration'],
  'image-to-video': ['image', 'video', 'conversion'],
  'stock-media': ['stock', 'media', 'library'],
  'ai-agents': ['agent', 'automation', 'workflow'],
  'brand-kit': ['brand', 'kit', 'branding'],
};

function matchFeatureKeywords(featureText, featureId) {
  const keywords = FEATURE_KEYWORD_MAP[featureId] || [];
  return keywords.some(keyword => featureText.includes(keyword));
}

function checkFeatureMatch(featureText, featureId) {
  const textLower = featureText.toLowerCase();
  const searchId = featureId.toLowerCase().replace('-', ' ');
  const displayName = getFeatureDisplayName(featureId).toLowerCase();
  
  const directMatch = textLower.includes(searchId);
  const displayMatch = textLower.includes(displayName);
  const keywordMatch = matchFeatureKeywords(textLower, featureId);
  
  return {
    featureId,
    featureText,
    directMatch,
    displayMatch,
    keywordMatch,
    matches: directMatch || displayMatch || keywordMatch
  };
}

// Test with our updated feature texts
const testCases = [
  { featureText: 'AI Assistant', featureId: 'ai-assistant' },
  { featureText: 'Creative Assistant', featureId: 'creative-assistant' },
  { featureText: 'Social Integrations', featureId: 'social-integrations' },
  { featureText: 'Media Library', featureId: 'media-library' },
  { featureText: 'Profile Settings', featureId: 'profile-settings' },
  { featureText: 'AI Script & Image Generation', featureId: 'script-generator' },
  { featureText: 'AI Voice Cloning', featureId: 'voice-cloning' },
  { featureText: 'Magic Clips Generator', featureId: 'magic-clips' },
];

console.log('Testing feature matching logic:\n');
let allPassed = true;

testCases.forEach(test => {
  const result = checkFeatureMatch(test.featureText, test.featureId);
  console.log(`Feature: ${test.featureId}`);
  console.log(`  Text: "${test.featureText}"`);
  console.log(`  Direct match: ${result.directMatch}`);
  console.log(`  Display match: ${result.displayMatch}`);
  console.log(`  Keyword match: ${result.keywordMatch}`);
  console.log(`  ✅ Matches: ${result.matches}`);
  console.log('---');
  
  if (!result.matches) {
    allPassed = false;
  }
});

// Test the actual logic from the feature-access-service
function simulateDatabaseCheck(planFeatures, featureId) {
  const hasFeature = planFeatures.some(feature => {
    const featureText = feature.text.toLowerCase();
    const searchId = featureId.toLowerCase().replace('-', ' ');
    
    return featureText.includes(searchId) || 
           featureText.includes(getFeatureDisplayName(featureId).toLowerCase()) ||
           matchFeatureKeywords(featureText, featureId);
  });
  
  return hasFeature;
}

// Simulate Free plan features from our updated seed
const freePlanFeatures = [
  { text: '5 Video Exports / mo' },
  { text: '1,000 AI Credits' },
  { text: '2 GB Storage' },
  { text: 'Standard Support' },
  { text: 'AI Assistant' },
  { text: 'Creative Assistant' },
  { text: 'Social Integrations' },
  { text: 'Media Library' },
  { text: 'Profile Settings' },
];

console.log('\n\nSimulating database check for Free plan:');
const freeFeaturesToCheck = ['ai-assistant', 'creative-assistant', 'social-integrations', 'media-library', 'profile-settings'];
freeFeaturesToCheck.forEach(featureId => {
  const hasAccess = simulateDatabaseCheck(freePlanFeatures, featureId);
  console.log(`  ${featureId}: ${hasAccess ? '✅ Access granted' : '❌ Access denied'}`);
});

// Test with old feature texts (should fail)
const oldFreePlanFeatures = [
  { text: '5 Video Exports / mo' },
  { text: '1,000 AI Credits' },
  { text: '2 GB Storage' },
  { text: 'Standard Support' },
];

console.log('\n\nSimulating database check with OLD Free plan (should fail):');
freeFeaturesToCheck.forEach(featureId => {
  const hasAccess = simulateDatabaseCheck(oldFreePlanFeatures, featureId);
  console.log(`  ${featureId}: ${hasAccess ? '✅ Access granted' : '❌ Access denied'}`);
});

console.log('\n' + (allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'));