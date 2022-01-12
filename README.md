# CRT UI - A VSCode theme overhaul

I'm a huge fan of the classic Fallout games and of the whole CRT look, generally speaking, so I made
this thing you're seeing here and, because I couldn't find anything to scratch that itch before, I
decided to release it as I know there's other folks that share my dubious taste.

I know that the awesome
[CRT Themes](https://marketplace.visualstudio.com/items?itemName=krueger71.crt-themes) has been out
there for a while and if you're looking for just a color change with the same old school feel, then I'd recommending getting that one
as it is a lot lighter (performance wise) than this.

The CRT UI will change the workbench styles, change the UI font (to OCR A) and add some cool effects
here and there (some glow, scanlines, static noise, flicker) and some opinionated stylistic choices.

I have tried to add some frame overlay and screen curvature using shaders and WebGl, but, to my
knowledge, that's not possible on VSCode currently. If anyone out there has ideas or more knowledge
on that regard and want to try their hand on this, feel free to open a PR.

## Install
1. Install the extendion
2. Set the theme to `CRT`
3. Run `> CRT: Enable theme`

## Uninstall
1. Run `> CRT: Disable theme`. Very important to run this first as it will remove the injected styles.
2. Uninstall the extension as you normally would.

> Note: If you uninstall the extension without running the `> CRT: Disable theme` command you will end up with leftover styles and your VSCode looking like limp poo (`panik`).
You'll have to manually delete the code from the `workbench.html`, which, on Windows, is normally located at `C:\Users\<username>\AppData\Local\Programs\Microsoft VS Code\resources\app\out\vs\code\electron-browser\workbench\workbench.html`. I have no clue where that file would be on other OSs, but you're supposed to be an engineed, so you'll find it somehow.
1. Open that file and delete the `<style>` and `<script>` tags you'll find there before the closing `</html>` tag.
2. *Kalm!

## Things to keep in mind:

- This is not intended to make things more ergonomical, friendly, easy on the eyes or easier to read. In fact, it will make things harder to read but that's the nature of these effects.
- Although I tried to keep performance the best possible, you'll still notice more CPU and GPU usage as the effects are resource hungry, not Crysis like, but still more demanding than the vanilla VSCode is.
