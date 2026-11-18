# AI Usage

This file lists the generative AI tools the team used and the features AI helped implement. Per-file levels are in the `AI contribution:` comment at the top of each source file.

## AI tools used
- ChatGPT ([#183](https://github.com/Strange4/RenaEngine/pull/183))
- GitHub Copilot ([#103](https://github.com/Strange4/RenaEngine/pull/103), and commits co-authored by Copilot)
- Claude (commits co-authored by Claude)
- Visual Studio IntelliCode ([#100](https://github.com/Strange4/RenaEngine/pull/100), [#185](https://github.com/Strange4/RenaEngine/pull/185), [#191](https://github.com/Strange4/RenaEngine/pull/191))

## AI-assisted features

### Game Viewer

#### Replay viewer and playback controls (#170, story #10)
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

#### Step forward and step backward controls (#172, #173)
- **Pull request:** [#208](https://github.com/Strange4/RenaEngine/pull/208)
- **AI contribution:** 50% or more AI-generated (mostly tests for proper coverage)
- **AI-assisted files:** `replayController.test.ts`, `ReplayControls.test.tsx`, `ReplayViewer.test.tsx`, `renderableChangeProcessor.test.ts`

**Verification:** manual testing with a sample recording at `/replay/1`, stepping forward and back through creates, moves, rotations and removals, including stepping during playback; unit tests added for stepping forward (controller), stepping backward (controller), the `getRenderable` lookup, and the step buttons in `ReplayControls` and `ReplayViewer`; all tests pass locally and in CI.

#### Playback speed controls (#174)
- **Pull request:** [#187](https://github.com/Strange4/RenaEngine/pull/187)

**What AI assisted with:** AI has been used to fix the failing tests, namely it found typos I made and corrected the tests (it also helped me understand how to include the concept of the speed + animation duration for the animations to follow the user's selection and pixijs's ticker logic).

**Verification:** all tests pass locally and in CI.

#### Dynamic tile viewer setup (#176)
- **Pull request:** [#181](https://github.com/Strange4/RenaEngine/pull/181)
- **AI contribution:** Below 50% AI-generated

**What AI assisted with:** AI was used in the making of this PR.

**Verification:** manual testing of resizing in the Live Viewer and the Replay Viewer (recordings attached to the PR); unit tests added or updated; all tests pass locally and in CI.

#### Live event consumer (2.5.1)
- **Pull request:** [#178](https://github.com/Strange4/RenaEngine/pull/178)

**What AI assisted with:** The tests and refactoring of tests in this PR were AI generated and verified and reviewed manually for their usefulness and relevance. The feature code is hand written.

**Verification:** manual testing that server-sent events are received from the server; unit tests added or updated; all tests pass locally and in CI.

#### Animations (#88)
- **Pull request:** [#166](https://github.com/Strange4/RenaEngine/pull/166)

**What AI assisted with:** All of the parts concerning pixi js and the ticker timing animations had the support of AI on top of the PixiJS manual documentation I researched.

**Verification:** unit tests added or updated; all tests pass locally and in CI.

#### Renderable change processor (#84) and missing index handling
- **Pull requests:** [#141](https://github.com/Strange4/RenaEngine/pull/141), [#143](https://github.com/Strange4/RenaEngine/pull/143)
- **AI contribution (#141):** Below 50% AI-generated

**What AI assisted with:** Another addition is to prevent things from running in the background whenever the viewer closes.-- this was AI's recommendation and I judged that it would be a good addition. AI has helped in writing the tests and the resync asynchronous function, especially since it had multiple cases to handle- the fetching of the current scene and the reverse engineering of the missed updates to give to the viewer.

**Verification:** unit tests added or updated; all tests pass locally and in CI.

#### Sprite rotation (#130)
- **Pull request:** [#131](https://github.com/Strange4/RenaEngine/pull/131)
- **AI contribution:** Below 50% AI-generated

**What AI assisted with:** AI was used to help with sprite rotation.

**Verification:** manual testing of sprite rotation in the mock scene (before and after a 180° rotation, screenshots in the PR); unit tests added or updated; all tests pass locally and in CI.

#### Map rendering and layer ordering (2.2.4, 2.2.5)
- **Pull request:** [#102](https://github.com/Strange4/RenaEngine/pull/102)
- **AI contribution:** 50% or more AI-generated

**What AI assisted with:** AI was used to help with debugging and conceptualizing the code.

**Verification:** manual testing of rendering in the Live Viewer; unit tests added or updated; all tests pass locally and in CI.

### Website

#### Submission code upload (#116, #132)
- **Pull request:** [#207](https://github.com/Strange4/RenaEngine/pull/207)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:**
  - `website/src/app/api/upload/route.ts`
  - `website/src/app/components/CodeUploadPanel.module.css`
  - `website/src/app/components/CodeUploadPanel.test.tsx`
  - `website/src/app/components/CodeUploadPanel.tsx`
  - `website/src/server/lib/game-server-uploads.test.ts`
  - `website/src/server/lib/game-server-uploads.ts`
  - `website/src/server/routes/uploads/submission.test.ts`
  - `website/src/server/routes/uploads/submission.ts`
  - `website/src/shared/submission-archive.test.ts`
  - `website/src/shared/submission-archive.ts`
  - `website/src/test-utils/zip.ts`
  - `website/tests/submission-upload.spec.ts`

#### Navigation to the Live Viewer (#196)
- **Pull request:** [#197](https://github.com/Strange4/RenaEngine/pull/197)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `AdminLiveViewerForm.module.css`, `AdminLiveViewerForm.test.tsx`

**Verification:** manual testing; unit tests added or updated; all tests pass locally and in CI.

#### Participant dashboard restyle and feature status enums (#158)
- **Pull request:** [#186](https://github.com/Strange4/RenaEngine/pull/186)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `AppTopBar.module.css`, `participant.module.css`

**Verification:** manual testing; unit tests added or updated; all tests pass locally and in CI.

#### Login and access-denied page restyle (#157)
- **Pull request:** [#167](https://github.com/Strange4/RenaEngine/pull/167)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `login.module.css`, `access-denied.module.css`

**Verification:** manual testing; existing tests pass locally and in CI (no tests added).

#### SDK download interface (#115)
- **Pull request:** [#151](https://github.com/Strange4/RenaEngine/pull/151)

**What AI assisted with:** Used to review code and write tests.

**Verification:** tests added for the participant interface, language registry, download proxy, game-server client and feature gating; 29 website test suites and 200 tests passed locally; production Next.js build passed.

#### SQLite foundation and volume mount
- **Pull request:** [#150](https://github.com/Strange4/RenaEngine/pull/150)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `db.test.ts`

**Verification:** ran locally and checked there were no breaking changes; unit tests in `db.test.ts`; all tests pass locally and in CI.

#### Participant token management page (#118)
- **Pull request:** [#128](https://github.com/Strange4/RenaEngine/pull/128)

**What AI assisted with:** AI was used to help create the tests.

**Verification:** manual testing with `next dev` and a sample token file (admin sees the sorted table, a participant is redirected to `/access-denied`, a logged-out visitor is redirected to `/login`); unit tests for the token store, formatting helpers, table, copy button and page (100% coverage on the new files); all 205 tests pass locally and `tsc --noEmit` is clean.

#### Access denied error pages (#54)
- **Pull request:** [#113](https://github.com/Strange4/RenaEngine/pull/113)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `access-denied/page.test.tsx`, `globals.css` (LoadingScreen-related CSS, e.g. the spinner)

**Verification:** manual testing; unit tests added or updated; all tests pass locally and in CI.

#### Feature locking on a test page (#53)
- **Pull request:** [#106](https://github.com/Strange4/RenaEngine/pull/106)

**What AI assisted with:** AI helped me write the tests.

**Verification:** unit tests added or updated; all tests pass locally and in CI.

#### Session persistence (#44)
- **Pull request:** [#104](https://github.com/Strange4/RenaEngine/pull/104)

**What AI assisted with:** AI was used to help write the test cases.

**Verification:** unit tests added or updated; all tests pass locally and in CI.

#### Session verification endpoint (#43)
- **Pull request:** [#103](https://github.com/Strange4/RenaEngine/pull/103)
- **AI-assisted files:** `me.test.ts`

**What AI assisted with:** AI (GitHub Copilot) was used only to help write the unit tests in `me.test.ts`.

**Verification:** ran `npx jest src/server` locally (2 suites, 18 tests passed); `me.ts` has 100% coverage.

### Game Server

#### Connect game sockets to the orchestrator to play live games (#134)
- **Pull request:** [#165](https://github.com/Strange4/RenaEngine/pull/165)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `GameRoomManagerTests.cs`, `GameSocketConnectionTests.cs`, `GameSocketHandlerTests.cs`, `MatchMakerTests.cs`

**What AI assisted with:** AI was used to fix some tests.

**Verification:** manual testing of the success scenario.

#### Connect Battleship to the game engine (#112)
- **Pull request:** [#129](https://github.com/Strange4/RenaEngine/pull/129)
- **AI contribution:** 50% or more AI-generated
- **AI-assisted files:**
  - `game-server/Rena.Tests/integration-tests/RenderStreamTests.cs` (I wasn't sure how to configure the WebApplication and HttpClient so I used AI here)
  - `game-server/Rena/Server/RenaServerSetup.cs` (specifically the /render/stream/{playerId} endpoint to help debug for needing await context.Response.Body.FlushAsync(); at the beginning of a connection)

**Verification:** manual check that the `/render/stream` endpoint produced the JSON output in Chrome; unit tests added or updated; all tests pass locally and in CI.

### CI

#### SonarQube and Codecov setup (#97)
- **Pull request:** [#98](https://github.com/Strange4/RenaEngine/pull/98)
- **AI contribution:** Below 50% AI-generated
- **AI-assisted files:** `website/src/app/components/LiveViewer.test.tsx`

**What AI assisted with:** AI was used to help mock the Pixi.js library. It was also used to help search through codecov and sonarqube documentation to find the right places on how to configure the services.

**Verification:** manual testing (each push to the PR runs the pipeline); all tests pass locally and in CI.

## Problems found in AI-generated code
- None reported in the pull requests.
