import { alignAndDiff } from '../src/lib/cv';

alignAndDiff({
  artworkPath: 'scratch/test_out.png',
  printPath: 'scratch/test_out.png',
  alignedOutPath: 'scratch/aligned_test.png',
  diffOutPath: 'scratch/diff_test.png',
  mismatchThreshold: 0.06,
}).then(res => {
  console.log('Result:', res);
}).catch(console.error);
