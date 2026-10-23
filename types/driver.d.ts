declare module 'driver.js' {
  export type Side = 'top' | 'right' | 'bottom' | 'left';
  export type Alignment = 'start' | 'center' | 'end';
  export type AllowedButtons = 'next' | 'previous' | 'close';

  export interface Popover {
    title?: string;
    description?: string;
    side?: Side;
    align?: Alignment;
    showButtons?: AllowedButtons[];
    showProgress?: boolean;
    disableButtons?: AllowedButtons[];
    popoverClass?: string;
    progressText?: string;
    doneBtnText?: string;
    nextBtnText?: string;
    prevBtnText?: string;
    closeBtnLabel?: string;
    onPopoverRender?: (popover: PopoverDOM, opts: HookOpts) => void;
    onNextClick?: DriverHook;
    onPrevClick?: DriverHook;
    onCloseClick?: DriverHook;
    onDoneClick?: DriverHook;
  }

  export interface PopoverDOM {
    wrapper: HTMLElement;
    arrow: HTMLElement;
    title: HTMLElement;
    description: HTMLElement;
    footer: HTMLElement;
    progress: HTMLElement;
    previousButton: HTMLButtonElement;
    nextButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    footerButtons: HTMLElement;
  }

  export interface DriverHook {
    (element: Element | undefined, step: DriveStep, opts: HookOpts): void;
  }

  export interface HookOpts {
    config: Config;
    state: State;
    driver: Driver;
    index: number | undefined;
  }

  export interface Config {
    steps?: DriveStep[];
    animate?: boolean;
    duration?: number;
    overlayColor?: string;
    overlayOpacity?: number;
    smoothScroll?: boolean;
    allowClose?: boolean;
    allowScroll?: boolean;
    overlayClickBehavior?: 'close' | 'nextStep' | 'none' | DriverHook;
    stagePadding?: number;
    stageRadius?: number;
    disableActiveInteraction?: boolean;
    advanceOnClick?: boolean;
    skipMissingElement?: boolean;
    waitForElement?: number;
    allowKeyboardControl?: boolean;
    popoverClass?: string;
    popoverOffset?: number;
    showButtons?: AllowedButtons[];
    disableButtons?: AllowedButtons[];
    showProgress?: boolean;
    progressText?: string;
    nextBtnText?: string;
    prevBtnText?: string;
    doneBtnText?: string;
    closeBtnLabel?: string;
    onPopoverRender?: (popover: PopoverDOM, opts: HookOpts) => void;
    onHighlightStarted?: DriverHook;
    onHighlighted?: DriverHook;
    onDeselected?: DriverHook;
    onDestroyStarted?: DriverHook;
    onDestroyed?: DriverHook;
    onNextClick?: DriverHook;
    onPrevClick?: DriverHook;
    onCloseClick?: DriverHook;
    onDoneClick?: DriverHook;
  }

  export interface State {
    isInitialized?: boolean;
    activeIndex?: number;
    activeElement?: Element;
    activeStep?: DriveStep;
    previousElement?: Element;
    previousStep?: DriveStep;
    popover?: PopoverDOM;
  }

  export interface DriveStep {
    element?: string | Element | (() => Element);
    onHighlightStarted?: DriverHook;
    onHighlighted?: DriverHook;
    onDeselected?: DriverHook;
    popover?: Popover;
    disableActiveInteraction?: boolean;
    advanceOnClick?: boolean;
    skipMissingElement?: boolean;
    waitForElement?: number;
    data?: Record<string, any>;
  }

  export interface Driver {
    isActive: () => boolean;
    refresh: () => void;
    drive: (stepIndex?: number) => void;
    setConfig: (config: Config) => void;
    setSteps: (steps: DriveStep[]) => void;
    getConfig: () => Config;
    getState: (key?: string) => any;
    getActiveIndex: () => number | undefined;
    isFirstStep: () => boolean;
    isLastStep: () => boolean;
    getActiveStep: () => DriveStep | undefined;
    getActiveElement: () => Element | undefined;
    getPreviousElement: () => Element | undefined;
    getPreviousStep: () => DriveStep | undefined;
    getNextStep: () => DriveStep | undefined;
    moveNext: () => void;
    movePrevious: () => void;
    moveTo: (index: number) => void;
    hasNextStep: () => boolean;
    hasPreviousStep: () => boolean;
    highlight: (step: DriveStep) => void;
    destroy: () => void;
  }

  const driver: (options?: Config) => Driver;
  export { driver };
  export default driver;
}