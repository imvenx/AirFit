# Todo:

- Add categories: Training, Fun

## Boxing game 
- [] Add medals for high score (silver, bronze, gold, etc trouphies or whatever) and Achievements section
- [] rebrand and marketing, generate images and videos
- [] improve ui (use svg buttons/decorations if needed)
- [] ? add distance detector/warning/instruction
- [] Add difficulty selector, easy, medium, hard
- [] add language selector menu on first time opening the app
- [] Localize game to indian chinese south korean
- [] Localize google play store page to spanish, indian, chinese, south korean
- [] add settings menu, music vol game vol
- [] add anon head
- [] add total bags hited
- [] cut songs to not have silence moment
- [] add bomb instead of bag sometimes
- [] add heart to pick
- [] add power ups, like slow time, gold bags

- [x] Make score bigger when is higher
- [x] refactor managers and stuff to make it srp
- [x] fix linting issues
- [x] Add hits to dodge and each hit takes one heart
- [x] make min sound higher on hit bag
- [x] Localize dodge! text
- [x] persist language selection on restart app
- [x] fix ui responsive issue portrait samsung phone
- [x] fix landscape view issue
- [x] Missed bags dont take lose hearts
- [x] change lobby music for better one
- [x] Change pitch hit sound if score higher
- [x] Add sound effect start (ring bell)
- [x] Remove time limit
- [x] add landscape mode
- [x] Rebrand game as Air Boxing VR or AR Sports / Camera Sports / Sports Mirror
- [x] Add dev mode so we dont show safety warning
- [x] Add debug mode?
- [x] fix black screen forever

- Add tutorial section/explanation
- Make sure localization is working on devices with diffferent languages by default
- fix scroll main menu
- [] Optimize audio files and others to take less space.

# Android Release

- [x] fix bug portrait game scene overflowing x axis
- [x] prevent bubbles create outside of screen, use screen (size - radius)
- [x] make menus 90% max-width, and font smaller

# RELEASE [x] DONE

- [x] test with low cpu + low wifi conditions. Result: (doesn't work properly on samsung tab)
- [x] add game music (and option to mute)
- [x] make music to loop
- [x] fix bug difficulty starts and game before enabling camera
- [x] add highscore local storage and show on end game
- [x] flow menus (cover, welcome, tutorial, exit, settng, credits)
- [x] explode bomb anim (shake screen, screen color or smt)
- [x] fix game scene resizing delay
- [x] Destroy bubble animation
- [x] responsive
- [x] Increase difficulty progressively
- [x] (more or less) Prevent bubbles be half out of the screen
- [x] Enhance bombs (animation red)
- [x] bubble have differfent sizes, bop sound matches bubble size (bigger lower frequency)

# POST-RELEASE

- [x] make responsive for mobile
- [x] refactor and make proper code
- make bubbles relative radius size to screen size
- Add pre-game explanation (objective, position, lighting etc)
- Game Start Countdown 3 2 1 Go!
- Enable camera component
- On touch bomb destroy all bubbles and bombs around
- add combo (hit many at the same time in less that 1 second)
- Add combo (+n score for each bubble you touch consecutively without taking damage)
- Add full screen button
- Add use bg filter?
- Add power ups (invincibility, increased buble catch range, heart recovery, clean screen)
- Add power downs (bigger bombs, moving game scene)
- Add collectable items (shield for extra 1 deffense)
- Add objectives (collect 100 bubbles without taking damage, surpass 200 bubbles)
