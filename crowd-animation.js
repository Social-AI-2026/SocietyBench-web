// SocietyBench — Crowd Walking Animation
// People walking from left to right and right to left

class CrowdAnimation {
  constructor(container) {
    this.container = container;
    this.people = [];
    this.currentRate = 6;     // start at 6x speed, eased back to 1x on load
    this._rateFrame = null;
    this.isDispersing = false; // Track if crowd is dispersing
    this.init();
  }

  // Apply the current playback rate to every person's CSS animations.
  applyRateToAll() {
    this.people.forEach(person => this.applyRateTo(person));
  }

  applyRateTo(person) {
    const anims = person.getAnimations ? person.getAnimations() : [];
    console.log(`Applying rate ${this.currentRate} to person, found ${anims.length} animations`);
    if (anims.length === 0) {
      // Fallback: directly modify animation via CSS if getAnimations doesn't work
      const currentDuration = person.style.animationDuration;
      if (currentDuration) {
        const originalDuration = parseFloat(person.getAttribute('data-original-duration'));
        if (originalDuration) {
          const newDuration = originalDuration / this.currentRate;
          person.style.animationDuration = `${newDuration}s`;
          console.log(`Fallback: Changed duration from ${originalDuration}s to ${newDuration}s`);
        }
      }
    } else {
      anims.forEach(a => { a.playbackRate = this.currentRate; });
    }
  }

  // Smoothly tween currentRate from its current value to `toRate` over `duration` ms.
  tweenRate(toRate, duration) {
    if (this._rateFrame) cancelAnimationFrame(this._rateFrame);
    const fromRate = this.currentRate;
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.currentRate = fromRate + (toRate - fromRate) * eased;
      this.applyRateToAll();
      if (t < 1) {
        this._rateFrame = requestAnimationFrame(tick);
      } else {
        this._rateFrame = null;
      }
    };
    this._rateFrame = requestAnimationFrame(tick);
  }

  init() {
    this.startWalkingCrowd();
    this.setupMouseInteraction();
    this.setupScrollInteraction();
    // Page-load intro: people enter at 4x, then ease back to 1x over 5s.
    this.tweenRate(1, 5000);
  }

  setupScrollInteraction() {
    const scrollThreshold = 100; // Scroll down 100px to trigger

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;

      // If scrolled down more than threshold and hasn't started dispersing yet
      if (currentScrollY > scrollThreshold && !this.isDispersing) {
        console.log('📜 Scrolled down - stopping new people and accelerating existing to 35x speed');
        this.isDispersing = true;

        // Stop generating new people
        if (this.leftInterval) clearInterval(this.leftInterval);
        if (this.rightInterval) clearInterval(this.rightInterval);

        // Accelerate existing people to 35x speed to finish their journey
        this.tweenRate(35, 500); // Quickly ramp up to 35x speed in 0.5s

        // No container fadeout - people just exit naturally at high speed
      }
    });
  }

  disperseCrowd() {
    // Make all people fade out and disappear
    this.people.forEach(person => {
      person.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      person.style.opacity = '0';
      person.style.transform = 'scale(0.5) translateY(-50px)';
    });

    // Hide container (but don't change opacity, just visibility)
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';
    this.container.style.pointerEvents = 'none';
    this.container.setAttribute('data-dispersed', 'true');
  }

  restoreCrowd() {
    // Restore all people
    this.people.forEach(person => {
      person.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      person.style.opacity = '';  // Remove inline style, use CSS default
      person.style.transform = '';
    });

    // Show container
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '';  // Remove inline style
    this.container.style.pointerEvents = 'auto';
    this.container.removeAttribute('data-dispersed');
  }

  setupMouseInteraction() {
    // Container-level interaction (slow down all people)
    this.container.addEventListener('mouseenter', () => {
      console.log('🖱️ Mouse entered crowd area - slowing down');
      this.tweenRate(0, 2000); // 2s smooth slowdown to a full stop
    });

    this.container.addEventListener('mouseleave', () => {
      console.log('🖱️ Mouse left crowd area - resuming');
      this.tweenRate(1, 800); // 0.8s smooth resume to normal speed
    });

    // Individual person hover interaction
    this.setupPersonHoverEffects();
  }

  setupPersonHoverEffects() {
    // Add hover listeners to each person individually
    const addHoverListeners = (person) => {
      person.addEventListener('mouseenter', () => {
        console.log('✨ Mouse entered person');
        this.container.classList.add('person-hovered');
        person.classList.add('highlighted');
      });

      person.addEventListener('mouseleave', () => {
        console.log('🔄 Mouse left person');
        this.container.classList.remove('person-hovered');
        person.classList.remove('highlighted');
      });
    };

    // Add listeners to existing people
    this.people.forEach(person => addHoverListeners(person));

    // Store the function so we can use it for new people
    this._addHoverListeners = addHoverListeners;
  }

  // List of available person images
  getPersonImages() {
    return [
      'Snipaste_2026-05-26_23-13-28.png',
      'Snipaste_2026-05-26_23-13-37.png',
      'Snipaste_2026-05-26_23-13-40.png',
      'Snipaste_2026-05-26_23-13-46.png',
      'Snipaste_2026-05-26_23-13-49.png',
      'Snipaste_2026-05-26_23-13-53.png',
      'Snipaste_2026-05-26_23-13-56.png',
      'Snipaste_2026-05-26_23-14-04.png',
      'Snipaste_2026-05-26_23-14-08.png',
      'Snipaste_2026-05-26_23-14-10.png',
      'Snipaste_2026-05-26_23-14-14.png',
      'Snipaste_2026-05-26_23-14-18.png',
      'Snipaste_2026-05-26_23-14-23.png',
      'Snipaste_2026-05-26_23-14-31.png',
      'Snipaste_2026-05-26_23-14-34.png',
      'Snipaste_2026-05-26_23-14-39.png',
      'Snipaste_2026-05-26_23-14-46.png',
      'Snipaste_2026-05-26_23-14-55.png',
      'Snipaste_2026-05-26_23-15-10.png',
      'Snipaste_2026-05-26_23-15-13.png',
      'Snipaste_2026-05-26_23-15-20.png',
      'Snipaste_2026-05-26_23-15-33.png',
      'Snipaste_2026-05-26_23-15-37.png',
      'Snipaste_2026-05-26_23-15-45.png',
      'Snipaste_2026-05-26_23-15-49.png',
      'Snipaste_2026-05-26_23-16-03.png',
      'Snipaste_2026-05-26_23-16-08.png',
      'Snipaste_2026-05-26_23-16-15.png',
      'Snipaste_2026-05-26_23-16-21.png',
      'Snipaste_2026-05-26_23-16-28.png',
      'Snipaste_2026-05-26_23-16-33.png',
      'Snipaste_2026-05-26_23-16-56.png',
      'Snipaste_2026-05-26_23-16-59.png',
      'Snipaste_2026-05-26_23-17-05.png',
      'Snipaste_2026-05-26_23-17-09.png',
      'Snipaste_2026-05-26_23-17-13.png'
    ];
  }

  // Generate a random person silhouette SVG
  generatePersonSVG(type, facingRight) {
    const transform = facingRight ? '' : 'transform="scale(-1, 1)" transform-origin="50 100"';

    const svgs = {
      // Type 1: Person with round head
      type1: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <circle cx="50" cy="30" r="20" fill="currentColor"/>
          <rect x="35" y="50" width="30" height="60" rx="5" fill="currentColor"/>
          <rect x="20" y="60" width="15" height="40" rx="3" fill="currentColor"/>
          <rect x="65" y="60" width="15" height="40" rx="3" fill="currentColor"/>
          <rect x="35" y="110" width="12" height="70" rx="3" fill="currentColor"/>
          <rect x="53" y="110" width="12" height="70" rx="3" fill="currentColor"/>
        </svg>
      `,
      // Type 2: Person with hair
      type2: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <ellipse cx="50" cy="25" rx="22" ry="28" fill="currentColor"/>
          <circle cx="50" cy="35" r="18" fill="currentColor"/>
          <rect x="32" y="53" width="36" height="65" rx="8" fill="currentColor"/>
          <rect x="18" y="65" width="14" height="45" rx="4" fill="currentColor"/>
          <rect x="68" y="65" width="14" height="45" rx="4" fill="currentColor"/>
          <rect x="35" y="118" width="13" height="75" rx="4" fill="currentColor"/>
          <rect x="52" y="118" width="13" height="75" rx="4" fill="currentColor"/>
        </svg>
      `,
      // Type 3: Person with glasses
      type3: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <circle cx="50" cy="32" r="22" fill="currentColor"/>
          <rect x="30" y="28" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="55" y="28" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="33" y="54" width="34" height="62" rx="6" fill="currentColor"/>
          <rect x="18" y="62" width="15" height="42" rx="3" fill="currentColor"/>
          <rect x="67" y="62" width="15" height="42" rx="3" fill="currentColor"/>
          <rect x="36" y="116" width="12" height="72" rx="3" fill="currentColor"/>
          <rect x="52" y="116" width="12" height="72" rx="3" fill="currentColor"/>
        </svg>
      `,
      // Type 4: Person with ponytail
      type4: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <circle cx="50" cy="30" r="20" fill="currentColor"/>
          <ellipse cx="70" cy="25" rx="8" ry="15" fill="currentColor"/>
          <rect x="34" y="50" width="32" height="64" rx="7" fill="currentColor"/>
          <rect x="20" y="58" width="14" height="44" rx="4" fill="currentColor"/>
          <rect x="66" y="58" width="14" height="44" rx="4" fill="currentColor"/>
          <rect x="36" y="114" width="12" height="74" rx="4" fill="currentColor"/>
          <rect x="52" y="114" width="12" height="74" rx="4" fill="currentColor"/>
        </svg>
      `,
      // Type 5: Person with beard
      type5: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <circle cx="50" cy="28" r="20" fill="currentColor"/>
          <ellipse cx="50" cy="42" rx="16" ry="12" fill="currentColor"/>
          <rect x="32" y="54" width="36" height="64" rx="6" fill="currentColor"/>
          <rect x="17" y="64" width="15" height="43" rx="3" fill="currentColor"/>
          <rect x="68" y="64" width="15" height="43" rx="3" fill="currentColor"/>
          <rect x="35" y="118" width="13" height="73" rx="3" fill="currentColor"/>
          <rect x="52" y="118" width="13" height="73" rx="3" fill="currentColor"/>
        </svg>
      `,
      // Type 6: Person with cap
      type6: `
        <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" ${transform}>
          <ellipse cx="50" cy="20" rx="28" ry="8" fill="currentColor"/>
          <rect x="35" y="18" width="30" height="8" fill="currentColor"/>
          <circle cx="50" cy="35" r="19" fill="currentColor"/>
          <rect x="33" y="54" width="34" height="62" rx="6" fill="currentColor"/>
          <rect x="19" y="62" width="14" height="42" rx="3" fill="currentColor"/>
          <rect x="67" y="62" width="14" height="42" rx="3" fill="currentColor"/>
          <rect x="36" y="116" width="12" height="72" rx="3" fill="currentColor"/>
          <rect x="52" y="116" width="12" height="72" rx="3" fill="currentColor"/>
        </svg>
      `
    };

    return svgs[type] || svgs.type1;
  }

  createPerson(direction) {
    const person = document.createElement('div');
    person.className = `crowd-person crowd-walking crowd-${direction}`;

    // Get random image from the list
    const images = this.getPersonImages();
    const randomImage = images[Math.floor(Math.random() * images.length)];

    const size = 200 + Math.random() * 100; // 200-300px (doubled from 100-150px)
    const speed = 15 + Math.random() * 15; // 15-30 seconds to cross screen
    const delay = 0; // no delay — people start walking immediately
    const bottomOffset = Math.random() * 25; // Random bottom position: 0-25px

    // Set styles
    person.style.width = `${size}px`;
    person.style.height = `${size * 2}px`;
    person.style.bottom = `${bottomOffset}px`; // Random vertical position
    person.style.animationDuration = `${speed}s`;
    person.style.animationDelay = `${delay}s`;

    // Store original duration for resume
    person.setAttribute('data-original-duration', `${speed}s`);

    // Add image (flip horizontally for right-to-left)
    const facingRight = direction === 'left-to-right';
    const flipStyle = facingRight ? '' : 'transform: scaleX(-1);';
    person.innerHTML = `<img src="figures/crowd/${randomImage}" style="width: 100%; height: 100%; object-fit: contain; ${flipStyle}" alt="person">`;

    this.container.appendChild(person);
    this.people.push(person);

    // Add hover listeners to this new person
    if (this._addHoverListeners) {
      this._addHoverListeners(person);
    }

    // Sync this new person to the current crowd-wide playback rate, so people
    // spawned while the mouse is hovering still come in slow.
    requestAnimationFrame(() => this.applyRateTo(person));

    // Remove the person when its CSS animation finishes. Using `animationend`
    // (instead of a fixed setTimeout) means slowed-down people aren't deleted
    // mid-walk while the mouse is hovering.
    person.addEventListener('animationend', () => {
      if (person.parentNode) person.remove();
      const index = this.people.indexOf(person);
      if (index > -1) this.people.splice(index, 1);
    });

    return person;
  }

  startWalkingCrowd() {
    const peoplePerSide = 50;
    const normalIntervalTime = 300; // Normal: 300ms per person
    const fastIntervalTime = 50;    // Fast: 50ms per person (first 1 second)
    const fastDuration = 1000;      // Fast generation for 1 second

    let currentIntervalTime = fastIntervalTime;
    const startTime = performance.now();

    // Left to right crowd
    let leftCount = 0;
    const leftInterval = setInterval(() => {
      // Stop generating if crowd is dispersing
      if (this.isDispersing) {
        clearInterval(leftInterval);
        return;
      }

      // Switch to normal speed after 1 second
      const elapsed = performance.now() - startTime;
      if (elapsed > fastDuration && currentIntervalTime === fastIntervalTime) {
        clearInterval(leftInterval);
        // Restart with normal speed
        this.startNormalGeneration('left', leftCount, peoplePerSide);
        return;
      }

      this.createPerson('left-to-right');
      leftCount++;
      if (leftCount >= peoplePerSide) {
        clearInterval(leftInterval);
        // Restart after all people have crossed
        setTimeout(() => {
          if (!this.isDispersing) {
            this.startWalkingCrowd();
          }
        }, 5000);
      }
    }, fastIntervalTime);

    // Right to left crowd
    let rightCount = 0;
    const rightInterval = setInterval(() => {
      // Stop generating if crowd is dispersing
      if (this.isDispersing) {
        clearInterval(rightInterval);
        return;
      }

      // Switch to normal speed after 1 second
      const elapsed = performance.now() - startTime;
      if (elapsed > fastDuration && currentIntervalTime === fastIntervalTime) {
        clearInterval(rightInterval);
        // Restart with normal speed
        this.startNormalGeneration('right', rightCount, peoplePerSide);
        return;
      }

      this.createPerson('right-to-left');
      rightCount++;
      if (rightCount >= peoplePerSide) {
        clearInterval(rightInterval);
      }
    }, fastIntervalTime);

    // Store intervals so we can stop them
    this.leftInterval = leftInterval;
    this.rightInterval = rightInterval;
  }

  startNormalGeneration(side, currentCount, totalCount) {
    const normalIntervalTime = 300;
    const direction = side === 'left' ? 'left-to-right' : 'right-to-left';

    const interval = setInterval(() => {
      if (this.isDispersing) {
        clearInterval(interval);
        return;
      }

      this.createPerson(direction);
      currentCount++;
      if (currentCount >= totalCount) {
        clearInterval(interval);
        if (side === 'left') {
          setTimeout(() => {
            if (!this.isDispersing) {
              this.startWalkingCrowd();
            }
          }, 5000);
        }
      }
    }, normalIntervalTime);

    if (side === 'left') {
      this.leftInterval = interval;
    } else {
      this.rightInterval = interval;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('crowd-container');
  if (container) {
    console.log('🎭 Initializing walking crowd animation');
    new CrowdAnimation(container);
  }
});
