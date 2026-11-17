# AI Usage

## AI tools used
- ChatGPT

## AI-assisted features

### Replay viewer and playback controls (#170, story #10)
- **Pull request:** [#183](https://github.com/Strange4/RenaEngine/pull/183)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:**
  - `website/src/app/viewer/replayController.test.ts`
  - `website/src/app/components/ReplayViewer.test.tsx`
  - `website/src/app/viewer/renderableChangeSource.test.ts`

**What AI assisted with:** ChatGPT was used to help write the automated tests for the replay controller, the replay viewer and the recorded change source, and to reach the required test coverage. The feature code (`replayController.ts`, `ReplayViewer.tsx`, `ReplayControls.tsx`, the replay page) was written by hand and reviewed with AI assistance as well as manually.

**Verification:**
- The AI-assisted tests were reviewed, and they run and pass in the CI pipeline (Website CI, SonarQube, Codecov) on the pull request.
- The feature was checked by running the app locally, opening the replay page and using the playback controls, along with visual inspection of the rendered replay.
- The pull request was reviewed and approved by a teammate before merging.

## Problems found in AI-generated code
- None.
