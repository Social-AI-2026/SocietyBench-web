// SocietyBench — Crowd Walking Animation
// People walking from left to right and right to left

class CrowdAnimation {
  constructor(container) {
    this.container = container;
    this.people = [];
    this.currentRate = 6;     // start at 6x speed, eased back to 1x on load
    this._rateFrame = null;
    this.isDispersing = false; // Track if crowd is dispersing
    this._bubbleEl = null;
    this._bubbleTimer = null;
    this.questions = [
      // 经济/市场
      "下周会下雨吗？",
      "美联储会加息吗？",
      "比特币能破 10 万吗？",
      "A 股明天涨还是跌？",
      "黄金还会涨吗？",
      "通胀什么时候降下来？",
      "房价会跌吗？",
      "失业率会上升吗？",
      "美元还会强势多久？",
      "原油价格会破百吗？",
      "纳指会创新高吗？",
      "下一家上市公司是谁？",
      "经济会衰退吗？",
      "下一个独角兽在哪？",
      // 科技/AI
      "AI 会替代我的工作吗？",
      "GPT-6 什么时候出？",
      "Claude 还能更强吗？",
      "AGI 哪一年到？",
      "下一个 ChatGPT 时刻是什么？",
      "自动驾驶真的安全吗？",
      "量子计算何时商用？",
      "脑机接口靠谱吗？",
      "下一个风口在哪？",
      "Meta 的元宇宙凉了吗？",
      "苹果会做 AI 手机吗？",
      "中美 AI 谁会赢？",
      "开源会战胜闭源吗？",
      "下一个独角兽是 AI 吗？",
      // 地缘/政治
      "总统大选谁会赢？",
      "战争什么时候结束？",
      "中东会再起冲突吗？",
      "台海会有变数吗？",
      "G7 会有新成员吗？",
      "联合国还有用吗？",
      "下一届奥运会在哪？",
      "气候协议能履行吗？",
      "OPEC 会减产吗？",
      "下一次峰会会有突破吗？",
      // 社会/文化
      "这部电影会爆吗？",
      "Taylor 还会出新专辑吗？",
      "下一届世界杯谁夺冠？",
      "NBA 总冠军是谁？",
      "梅西还能踢几年？",
      "诺贝尔奖颁给谁？",
      "下一个网红是谁？",
      "TikTok 会被禁吗？",
      "X 还能撑多久？",
      "下一个社交媒体是什么？",
      // 日常/天气
      "明天会堵车吗？",
      "今晚会失眠吗？",
      "这周末会有暴雨吗？",
      "明年夏天会更热吗？",
      "台风会登陆吗？",
      "冬天会很冷吗？",
      "雾霾会回来吗？",
      "今年会冷得早吗？",
      // 个人/生活
      "他会回我消息吗？",
      "她会答应吗？",
      "我能升职吗？",
      "明年能加薪吗？",
      "孩子能考上吗？",
      "这次相亲能成吗？",
      "明天考试能过吗？",
      "面试能通过吗？",
      "项目能按时上线吗？",
      "老板今天心情好吗？",
      "周末能放假吗？",
      "今晚吃什么？",
      "外卖什么时候到？",
      "快递明天能到吗？",
      // 健康/医学
      "新药什么时候上市？",
      "癌症能治愈吗？",
      "疫苗有效吗？",
      "下一次疫情会来吗？",
      "我能活到 100 岁吗？",
      "睡 8 小时真的够吗？",
      "咖啡到底好不好？",
      // 哲学/未来
      "我会被记住吗？",
      "外星人存在吗？",
      "时间能倒流吗？",
      "命运是注定的吗？",
      "意识是什么？",
      "宇宙的尽头在哪？",
      "我们活在模拟中吗？",
      "明天的我会更好吗？",
      "幸福是什么？",
      "孤独感会消失吗？",
      // 商业/品牌
      "特斯拉股价会破千吗？",
      "苹果还会发新品吗？",
      "Netflix 会再涨价吗？",
      "拼多多能超越淘宝吗？",
      "小米汽车能成功吗？",
      "字节会再 IPO 吗？",
      "马斯克下一步是什么？",
      // 其他
      "这次能预测对吗？",
      "明天会更好吗？",
      "真相是什么？",
      "未来会变好吗？",
      "答案就在前方吗？",
      "他在想什么？",
      "我做对了吗？",
      "时间够吗？",
      "还来得及吗？",
    ];
    this.init();
  }

  // Apply the current playback rate to every person's CSS animations.
  applyRateToAll() {
    this.people.forEach(person => this.applyRateTo(person));
  }

  applyRateTo(person) {
    let anims = person._cachedAnims;
    if (!anims || anims.length === 0) {
      anims = person.getAnimations ? person.getAnimations() : [];
      if (anims.length > 0) person._cachedAnims = anims;
    }
    if (anims.length === 0) {
      const originalDuration = parseFloat(person.getAttribute('data-original-duration'));
      if (originalDuration) {
        person.style.animationDuration = `${originalDuration / this.currentRate}s`;
      }
      return;
    }
    for (let i = 0; i < anims.length; i++) {
      anims[i].playbackRate = this.currentRate;
    }
  }

  // Smoothly tween currentRate from its current value to `toRate` over `duration` ms.
  tweenRate(toRate, duration) {
    if (this._rateFrame) cancelAnimationFrame(this._rateFrame);
    const fromRate = this.currentRate;
    const startTime = performance.now();
    let lastApplied = fromRate;

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.currentRate = fromRate + (toRate - fromRate) * eased;

      // Only push rate to DOM when it actually shifts meaningfully — drops the
      // 60fps-per-person DOM thrash during the 5s page-load ease-in.
      if (Math.abs(this.currentRate - lastApplied) > 0.05 || t === 1) {
        this.applyRateToAll();
        lastApplied = this.currentRate;
      }

      if (t < 1) {
        this._rateFrame = requestAnimationFrame(tick);
      } else {
        this._rateFrame = null;
      }
    };
    this._rateFrame = requestAnimationFrame(tick);
  }

  init() {
    this.setupMouseInteraction();
    this.setupScrollInteraction();
    this.setupClickDisperse();
    this.setupRouteSync();
  }

  isOnHomePage() {
    const page = document.body.getAttribute('data-active-page');
    // Treat unset (very early boot) and 'overview' as the home page.
    return !page || page === 'overview';
  }

  setupRouteSync() {
    window.addEventListener('sb:page-change', (e) => {
      const page = e.detail && e.detail.page;
      if (page === 'overview') this.start();
      else this.stop();
    });
    if (this.isOnHomePage()) this.start();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.isDispersing = false;
    this.container.style.display = '';
    if (this._hasBooted) {
      // Re-entry from another page: keep playback at normal speed, no
      // 6x-into-1x intro replay.
      this.currentRate = 1;
      this.startWalkingCrowd();
      this.applyRateToAll();
    } else {
      // First boot: 6x intro that eases back to 1x over 5s.
      this._hasBooted = true;
      this.currentRate = 6;
      this.startWalkingCrowd();
      this.tweenRate(1, 5000);
    }
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this.leftInterval) clearInterval(this.leftInterval);
    if (this.rightInterval) clearInterval(this.rightInterval);
    if (this._rateFrame) cancelAnimationFrame(this._rateFrame);
    if (this._bubbleTimer) { clearTimeout(this._bubbleTimer); this._bubbleTimer = null; }
    this.hideBubble();
    // Wipe everyone immediately so the canvas + DOM are clean for other pages.
    this.people.forEach(p => p.remove());
    this.people = [];
    this.isDispersing = true;
    this.container.style.display = 'none';
  }

  triggerDisperse() {
    if (this.isDispersing) return;
    if (!this._running) return;
    this.isDispersing = true;
    if (this.leftInterval) clearInterval(this.leftInterval);
    if (this.rightInterval) clearInterval(this.rightInterval);
    this.tweenRate(35, 500);
  }

  setupClickDisperse() {
    // Any button or .btn click anywhere on the page kicks off the same
    // fast-disperse effect as scrolling past the threshold.
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('button, .btn, .ctrl-btn, a, .sidebar nav li');
      if (!trigger) return;
      this.triggerDisperse();
    });
  }

  setupScrollInteraction() {
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
      if (window.scrollY > scrollThreshold) {
        this.triggerDisperse();
      }
    }, { passive: true });
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
    this.container.addEventListener('mouseenter', () => {
      this.tweenRate(0, 2000);
    });

    this.container.addEventListener('mouseleave', () => {
      this.tweenRate(1, 800);
    });

    this.setupPersonHoverEffects();
  }

  setupPersonHoverEffects() {
    // Event delegation: one set of listeners on the container, not 100 per-person.
    this.container.addEventListener('mouseover', (e) => {
      const person = e.target.closest('.crowd-person');
      if (!person || person._isHovered) return;
      person._isHovered = true;
      this.container.classList.add('person-hovered');
      person.classList.add('highlighted');
      // After things settle (scale-up + walk/bob pause), show a thought bubble.
      if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
      this._bubbleTimer = setTimeout(() => this.showBubble(person), 500);
    });

    this.container.addEventListener('mouseout', (e) => {
      const person = e.target.closest('.crowd-person');
      if (!person) return;
      // Ignore moves between child elements of the same person.
      if (person.contains(e.relatedTarget)) return;
      person._isHovered = false;
      person.classList.remove('highlighted');
      this.container.classList.remove('person-hovered');
      if (this._bubbleTimer) { clearTimeout(this._bubbleTimer); this._bubbleTimer = null; }
      this.hideBubble();
    });
  }

  showBubble(person) {
    if (!person.isConnected || !person._isHovered) return;
    const q = this.questions[Math.floor(Math.random() * this.questions.length)];
    if (!this._bubbleEl) {
      this._bubbleEl = document.createElement('div');
      this._bubbleEl.className = 'crowd-thought-bubble';
      document.body.appendChild(this._bubbleEl);
    }
    this._bubbleEl.textContent = q;
    const img = person.querySelector('img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    // Anchor right above the link connection point (image's vertical center).
    const linkCenterY = rect.top + rect.height / 2;
    this._bubbleEl.style.left = `${rect.left + rect.width / 2}px`;
    this._bubbleEl.style.top = `${linkCenterY - 24}px`;
    // Force reflow so the transition kicks in even on rapid re-show.
    void this._bubbleEl.offsetWidth;
    this._bubbleEl.classList.add('show');
  }

  hideBubble() {
    if (this._bubbleEl) this._bubbleEl.classList.remove('show');
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

    // Add image (flip horizontally for right-to-left). Wrap in a bob layer
    // so the walking translateX (outer) and bobbing translateY (wrapper)
    // don't share a transform.
    const facingRight = direction === 'left-to-right';
    const flip = facingRight ? 1 : -1;
    person.style.setProperty('--flip', flip);
    // Random negative delay so each person bobs out of phase with the rest.
    const bobDelay = -Math.random() * 1;
    person.innerHTML =
      `<div class="crowd-person-bob" style="animation-delay: ${bobDelay}s;">` +
        `<img src="figures/crowd/${randomImage}" style="transform: scaleX(${flip});" alt="person">` +
      `</div>`;

    this.container.appendChild(person);
    this.people.push(person);

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
    new CrowdAnimation(container);
  }
});
