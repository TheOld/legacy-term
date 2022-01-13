# CRT UI - A VSCode theme overhaul

I'm a huge fan of the classic Fallout games and of the whole CRT look, generally speaking, so I made
this thing you're seeing here and, because I couldn't find anything to scratch that itch before, I
decided to release it as I know there's other folks that share my dubious taste.

I know that the awesome
[CRT Themes](https://marketplace.visualstudio.com/items?itemName=krueger71.crt-themes) has been out
there for a while and if you're looking for just a color change with the same old-school feel, then I'd recommend getting that one
as it is a lot lighter (performance wise) than this.

The CRT UI will change both the workbench styles (font, icon colours, border colours, etc) and it includes a syntax theme based on the green one from [CRT Themes](https://marketplace.visualstudio.com/items?itemName=krueger71.crt-themes) and add some cool effects
here and there (glow, scanlines and static noise).

You can use any other syntax theme but it will look weird. Your call.

> I have tried to add some frame overlay and screen curvature using shaders and WebGl, but, to my
knowledge, that's not possible on VSCode currently. If anyone out there has ideas or more knowledge
on that regard and want to try their hand on this, feel free to open a PR.

So, if you're looking for something to emulate the bad refresh-rate, hard to read text and retina burning bright colours, you may have found it.

## Screenshots
The sreenshots make it look a bit worse than what it actually is. I'm blaming the static noise effect for the crappy appearance.

![Workbench](https://github.com/TheOld/legacy-term/blob/master/workbench.jpg?raw=true 'Workbench')

![Command Palette](https://github.com/TheOld/legacy-term/blob/master/workbench2.jpg?raw=true 'Command palette')

![Javascript](https://github.com/TheOld/legacy-term/blob/master/javascript.jpg?raw=true 'Javascript')

![CSS](https://github.com/TheOld/legacy-term/blob/master/css.jpg?raw=true 'CSS')

## Install

1. Install the extension
2. Start VSCode as admin `!important`
3. Set the theme to `CRT`
4. Run `> CRT: Enable theme`
5. Restart VSCode

### Optional but highly recommended
The workbench font has been changed to a more suitable one (as in more fitting with the CRT aesthetic), namelly the `IBM VGA 8x16`. It is freely available and you can download and install it from [here](https://int10h.org/oldschool-pc-fonts/fontlist/font?ibm_vga_8x16) (make sure you install the `Plus` version of that font).
If you don't want or can't install that font, the extension will fallback first to `OCR-A`, which you can download [here](https://github.com/TheOld/legacy-term/raw/master/fonts/ocr-a.zip), otherwise it'll fallback to `Consolas` and `Courier New`, in that order. Not that any of this matter though.

## Uninstall
1. Run VSCode as admin `!important`
2. Run `> CRT: Disable theme`. Very important to run this first as it will remove the injected styles.
3. Uninstall the extension as you normally would.
4. Restart VSCode

> Note: If you uninstall the extension without running the `> CRT: Disable theme` command you will end up with leftover styles and your VSCode looking like limp poo (`panik`).
You'll have to manually delete the code from the `workbench.html`, which, on Windows, is normally located at `C:\Users\<username>\AppData\Local\Programs\Microsoft VS Code\resources\app\out\vs\code\electron-browser\workbench\workbench.html`. I have no clue where that file would be on other OSs, but you're supposed to be an engineer, so you'll find it somehow.
1. Open that file and delete the `<style>` and `<script>` tags you'll find there before the closing `</html>` tag.
2. `Kalm!`

## Things to keep in mind:

- This is not intended to make things more ergonomical, friendly, easy on the eyes or easier to read. In fact, it will make things harder to read but that's the nature of these effects.
- Although I tried to keep performance the best possible, you'll still notice more CPU and GPU usage as the effects are resource hungry, not Crysis like, but still more demanding than the vanilla VSCode is.
