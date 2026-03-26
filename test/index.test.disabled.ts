// import { describe, expect, it } from 'vitest';

// import { createPackageSummary } from '../src/index';

// describe('createPackageSummary', () => {
//   it('formats a package summary line', () => {
//     expect(
//       createPackageSummary({
//         name: '@samatawy/checks',
//         version: '1.2.3',
//         description: 'Fluent validation checks'
//       })
//     ).toBe('@samatawy/checks@1.2.3: Fluent validation checks');
//   });

//   it('uses a default description when none is provided', () => {
//     expect(
//       createPackageSummary({
//         name: '@samatawy/checks',
//         version: '1.2.3'
//       })
//     ).toBe('@samatawy/checks@1.2.3: No description provided.');
//   });
// });