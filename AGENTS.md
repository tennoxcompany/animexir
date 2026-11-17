<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Direct video playback uses NativePlayer with browser video and lazily imported hls.js; embed sources remain isolated iframes because cross-origin playback cannot be controlled.
- User-selected SRT/VTT subtitles are converted to temporary browser-only VTT object URLs and revoked on replacement/unmount; selecting a subtitle does not publish it to other viewers.
- Episode source inputs accept HTTPS URLs or extract only the HTTPS src from iframe markup through the shared player normalizer; never render supplied HTML, so embedded scripts cannot enter the app.
- FeaturedShowcase reads existing episode comments with the viewer's normal client permissions and filters them to the displayed featured anime selection; hide the ticker when empty and never manufacture activity or bypass profile privacy.
