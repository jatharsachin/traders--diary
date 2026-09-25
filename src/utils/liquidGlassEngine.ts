/**
 * Agentic Context-Aware Liquid Glass Engine (iOS 27 Inspired)
 * Powered by Google Antigravity fluid physics & dynamic luminescence tracking.
 * 
 * NOTE: PURELY PRESENTATIONAL VISUAL ENGINE.
 * ZERO MUTATION OF TRADE DATA, LEDGER, OR PERSISTENT STORES.
 */

export interface LiquidGlassContext {
  scrollVelocity: number;
  contentDensity: 'spacious' | 'balanced' | 'compact';
  ambientMode: 'dark' | 'light' | 'emerald';
  pnlAura: 'win' | 'loss' | 'neutral';
  isInteracting: boolean;
}

class LiquidGlassEngine {
  private static instance: LiquidGlassEngine;
  private isInitialized = false;
  private lastScrollY = 0;
  private lastScrollTime = performance.now();
  private scrollVelocity = 0;
  private rafId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;

  private constructor() {}

  public static getInstance(): LiquidGlassEngine {
    if (!LiquidGlassEngine.instance) {
      LiquidGlassEngine.instance = new LiquidGlassEngine();
    }
    return LiquidGlassEngine.instance;
  }

  public init(initialTheme: string = 'dark') {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Set initial baseline Liquid Glass CSS variables
    this.updateGlassVariables({
      blur: 20,
      opacity: initialTheme === 'light' ? 0.75 : 0.08,
      specularOpacity: 0.28,
      borderAlpha: 0.14
    });

    // 1. Mouse Tracking for Surface Normal Specular Reflection
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });

    // 2. Dynamic Scroll Velocity & Inertia Sensing
    window.addEventListener('scroll', this.handleScroll, { passive: true });

    // 3. Antigravity Spring Physics for Interactive Cards
    document.addEventListener('mouseover', this.attachAntigravityListeners);

    // Initial frame loop
    this.startPhysicsLoop();
  }

  private handleMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    const root = document.documentElement;
    const xRatio = (this.mouseX / window.innerWidth) * 100;
    const yRatio = (this.mouseY / window.innerHeight) * 100;

    // Update global cursor coordinate tokens for specular reflections
    root.style.setProperty('--cursor-x', `${xRatio.toFixed(1)}%`);
    root.style.setProperty('--cursor-y', `${yRatio.toFixed(1)}%`);
  };

  private handleScroll = () => {
    const now = performance.now();
    const dt = Math.max(now - this.lastScrollTime, 1);
    const dy = window.scrollY - this.lastScrollY;
    
    // Calculate instantaneous scroll velocity in px/ms
    this.scrollVelocity = Math.min(Math.abs(dy / dt) * 10, 15);
    this.lastScrollY = window.scrollY;
    this.lastScrollTime = now;
  };

  private startPhysicsLoop = () => {
    const update = () => {
      // Natural fluid deceleration (antigravity damping)
      if (this.scrollVelocity > 0.05) {
        this.scrollVelocity *= 0.92;
        
        // Context-aware dynamic blur: increases during motion to mimic optical motion blur
        const dynamicBlur = Math.min(18 + this.scrollVelocity * 0.8, 26);
        document.documentElement.style.setProperty('--liquid-blur', `${dynamicBlur.toFixed(1)}px`);
      } else {
        this.scrollVelocity = 0;
        document.documentElement.style.setProperty('--liquid-blur', '20px');
      }

      this.rafId = requestAnimationFrame(update);
    };

    this.rafId = requestAnimationFrame(update);
  };

  /**
   * Applies 3D fluid surface tension tilt to glass cards on hover
   */
  private attachAntigravityListeners = (e: MouseEvent) => {
    const card = (e.target as HTMLElement)?.closest?.('.glass-card.interactive, .metric-card') as HTMLElement | null;
    if (!card || (card as any).__antigravityAttached) return;

    (card as any).__antigravityAttached = true;

    const handleCardMove = (moveEvt: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cardX = moveEvt.clientX - rect.left - rect.width / 2;
      const cardY = moveEvt.clientY - rect.top - rect.height / 2;

      // Antigravity surface tension: subtle tilt angle (max 3 degrees)
      const rotateX = -(cardY / (rect.height / 2)) * 3;
      const rotateY = (cardX / (rect.width / 2)) * 3;

      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`;
    };

    const handleCardLeave = () => {
      // Fluid spring bounce back to rest position
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
    };

    card.addEventListener('mousemove', handleCardMove, { passive: true });
    card.addEventListener('mouseleave', handleCardLeave, { once: true, passive: true });
  };

  public setPnlContext(pnl: number) {
    const root = document.documentElement;
    if (pnl > 0) {
      root.style.setProperty('--ambient-aura-primary', 'rgba(48, 209, 88, 0.22)');
      root.style.setProperty('--ambient-aura-secondary', 'rgba(10, 132, 255, 0.18)');
    } else if (pnl < 0) {
      root.style.setProperty('--ambient-aura-primary', 'rgba(255, 69, 58, 0.2)');
      root.style.setProperty('--ambient-aura-secondary', 'rgba(191, 90, 242, 0.18)');
    } else {
      root.style.setProperty('--ambient-aura-primary', 'rgba(10, 132, 255, 0.22)');
      root.style.setProperty('--ambient-aura-secondary', 'rgba(191, 90, 242, 0.18)');
    }
  }

  private updateGlassVariables(vars: { blur: number; opacity: number; specularOpacity: number; borderAlpha: number }) {
    const root = document.documentElement;
    root.style.setProperty('--liquid-blur', `${vars.blur}px`);
    root.style.setProperty('--liquid-translucency', `${vars.opacity}`);
    root.style.setProperty('--liquid-specular-opacity', `${vars.specularOpacity}`);
    root.style.setProperty('--liquid-border-alpha', `${vars.borderAlpha}`);
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('scroll', this.handleScroll);
      document.removeEventListener('mouseover', this.attachAntigravityListeners);
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }
    this.isInitialized = false;
  }
}

export const liquidGlassEngine = LiquidGlassEngine.getInstance();
