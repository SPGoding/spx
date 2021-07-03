# spx

[![Build Status](https://travis-ci.com/SPGoding/spx.svg?branch=master)](https://travis-ci.com/SPGoding/spx)
![GitHub Top Language](https://img.shields.io/github/languages/top/SPGoding/spx.svg)
![License](https://img.shields.io/github/license/SPGoding/spx.svg)

A powerful tool for SPGoding's personal use.

# Components

## SPX User Script™

Adds a "Copy BBCode" button to Minecraft.Net articles, which sets the [BBCode][bbcode] representation of this blog
article to your clipboard.

You can use browser extensions like [Tampermonkey][tampermonkey] to install this script from URL: `https://spx.spgoding.com/user-script`

## SPX Discord Bot™

Provides means for the members of a Discord guild to translate the summaries of _Minecraft: Java Edition_ bugs.

Translations done in the (SPGoding-Hosted™ SPX Discord Bot™)™ is accessible at [https://spx.spgoding.com/bugs][bugs], and
will be utilized by the SPX User Script™ to auto translate the "Fixed bugs" section in _Minecraft: Java Edition_

## SPX Web Server

Trash. Ultra trash.

# Special Thanks To

- [RicoloveFeng](https://github.com/RicoloveFeng) - maintains [minecraft.net-translations](https://github.com/RicoloveFeng/minecraft.net-translations/blob/master/rawtable.csv).

# Contributing

Development environment: [Node.js LTS][node]

- `npm ci` to install dependencies.
- `npm run build` to compile the TypeScript code.
- `npm start` to start the compiled SPX Web Server™ and SPX Discord Bot™.
- `./out/user_script.js` is the compiled SPX User Script™.

[bbcode]: https://en.wikipedia.org/wiki/BBCode
[bugs]: https://spx.spgoding.com/bugs
[node]: https://nodejs.org/
[tampermonkey]: https://www.tampermonkey.net
[user-script]: https://spx.spgoding.com/user-script
