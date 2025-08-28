interface GamepadStick {
    x: number;
    y: number;
}

interface ControllerState {
    connected: boolean;
    gamepad: Gamepad | null;
    buttonStates: Map<number, boolean>;
    stickPositions: {
        left: GamepadStick;
        right: GamepadStick;
    };
    triggerValues: {
        left: number;
        right: number;
    };
}



class PS5ControllerTester {
    private controllerState: ControllerState;
    private animationFrame: number = 0;
    private buttonMappings: Map<number, string>;
    private readonly PREVIEW_MAX_PX = 22;

    constructor() {
        this.controllerState = {
            connected: false,
            gamepad: null,
            buttonStates: new Map(),
            stickPositions: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
            triggerValues: { left: 0, right: 0 }
        };

        this.buttonMappings = new Map([
            [0, 'cross'],
            [1, 'circle'],
            [2, 'square'],
            [3, 'triangle'],
            [4, 'l1'],
            [5, 'r1'],
            [6, 'l2'],
            [7, 'r2'],
            [8, 'share'],
            [9, 'options'],
            [10, 'left-stick'],
            [11, 'right-stick'],
            [12, 'dpad-up'],
            [13, 'dpad-down'],
            [14, 'dpad-left'],
            [15, 'dpad-right'],
            [16, 'ps']
        ]);

        this.init();
    }

    private init(): void {
        this.setupEventListeners();
        this.startGamepadLoop();
    }

    private setupEventListeners(): void {
        window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
            console.log('Controller connected:', e.gamepad);
            this.handleControllerConnection(e.gamepad);
        });
        window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
            console.log('Controller disconnected:', e.gamepad);
            this.handleControllerDisconnection();
        });
        const vibrationTestBtn = document.getElementById('vibration-test');
        vibrationTestBtn?.addEventListener('click', () => {
            this.testVibration();
        });
    }

    private setupTabNavigation(): void {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                button.classList.add('active');
                const targetPanel = document.getElementById(targetTab!);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    private handleControllerConnection(gamepad: Gamepad): void {
        this.controllerState.gamepad = gamepad;
        this.controllerState.connected = true;
        const connectedElement = document.getElementById('controller-connected');
        if (connectedElement) connectedElement.textContent = 'Yes';
        this.updateVibrationStatus();
    }

    private updateVibrationStatus(): void {
        const vibrationElement = document.getElementById('controller-vibration');
        const testButton = document.getElementById('vibration-test') as HTMLButtonElement;
        let hasVibration = false;
        if (this.controllerState.gamepad) {
            const gamepad = this.controllerState.gamepad as any;
            if (gamepad.vibrationActuator) {
                hasVibration = true;
            }
            else if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
                hasVibration = true;
            }
            else if (typeof gamepad.vibrate === 'function') {
                hasVibration = true;
            }
        }
        if (vibrationElement) {
            vibrationElement.textContent = hasVibration ? 'Yes' : 'No';
        }
        if (testButton) {
            testButton.disabled = !hasVibration;
        }
    }

    private async testVibration(): Promise<void> {
        if (!this.controllerState.gamepad || !this.controllerState.connected) {
            alert('No controller connected!');
            return;
        }
        const gamepad = this.controllerState.gamepad as any;
        const testButton = document.getElementById('vibration-test') as HTMLButtonElement;
        try {
            if (testButton) {
                testButton.disabled = true;
                testButton.textContent = 'Vibrating...';
            }
            let vibrationSuccess = false;
            if (gamepad.vibrationActuator && gamepad.vibrationActuator.playEffect) {
                try {
                    console.log('Trying vibrationActuator API...');
                    await gamepad.vibrationActuator.playEffect('dual-rumble', {
                        duration: 500,
                        strongMagnitude: 1.0,
                        weakMagnitude: 1.0
                    });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await gamepad.vibrationActuator.playEffect('dual-rumble', {
                        duration: 500,
                        strongMagnitude: 1.0,
                        weakMagnitude: 1.0
                    });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await gamepad.vibrationActuator.playEffect('dual-rumble', {
                        duration: 400,
                        strongMagnitude: 1.0,
                        weakMagnitude: 1.0
                    });
                    vibrationSuccess = true;
                    console.log('vibrationActuator API successful');
                } catch (e) {
                    console.warn('vibrationActuator failed:', e);
                }
            }
            if (!vibrationSuccess && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
                try {
                    console.log('Trying hapticActuators API...');
                    const actuator = gamepad.hapticActuators[0];
                    if (actuator.playEffect) {
                        await actuator.playEffect('dual-rumble', {
                            duration: 1000,
                            strongMagnitude: 1.0,
                            weakMagnitude: 1.0
                        });
                        vibrationSuccess = true;
                        console.log('hapticActuators API successful');
                    }
                } catch (e) {
                    console.warn('hapticActuators failed:', e);
                }
            }
            if (!vibrationSuccess && typeof gamepad.vibrate === 'function') {
                try {
                    console.log('Trying legacy vibrate API...');
                    gamepad.vibrate(1.0, 1.0, 1000);
                    vibrationSuccess = true;
                    console.log('legacy vibrate API successful');
                } catch (e) {
                    console.warn('legacy vibrate failed:', e);
                }
            }
            if (!vibrationSuccess) {
                throw new Error('No supported vibration API found');
            }
            console.log('Vibration test completed successfully');
        } catch (error) {
            console.error('Vibration test failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Vibration test failed: ${errorMessage}`);
        } finally {
            setTimeout(() => {
                if (testButton) {
                    testButton.disabled = false;
                    testButton.textContent = 'Test';
                }
            }, 2000);
        }
    }

    private handleControllerDisconnection(): void {
        this.controllerState.connected = false;
        this.controllerState.gamepad = null;
        const connectedElement = document.getElementById('controller-connected');
        if (connectedElement) connectedElement.textContent = 'No';
        const vibrationElement = document.getElementById('controller-vibration');
        const testButton = document.getElementById('vibration-test') as HTMLButtonElement;
        if (vibrationElement) vibrationElement.textContent = 'No';
        if (testButton) {
            testButton.disabled = true;
            testButton.textContent = 'Test';
        }
        this.resetVisualElements();
    }

    private startGamepadLoop(): void {
        const loop = () => {
            this.updateGamepadState();
            this.updateVisualElements();
            this.animationFrame = requestAnimationFrame(loop);
        };
        loop();
    }

    private updateGamepadState(): void {
        const gamepads = navigator.getGamepads();
        if (!this.controllerState.connected || !gamepads[0]) {
            return;
        }
        const gamepad = gamepads[0];
        if (!gamepad) return;
        this.controllerState.gamepad = gamepad;
        gamepad.buttons.forEach((button, index) => {
            const wasPressed = this.controllerState.buttonStates.get(index) || false;
            const isPressed = button.pressed;
            this.controllerState.buttonStates.set(index, isPressed);
        });
        this.controllerState.stickPositions.left = this.getRawStickPosition(
            gamepad.axes[0], gamepad.axes[1], 'left'
        );
        this.controllerState.stickPositions.right = this.getRawStickPosition(
            gamepad.axes[2], gamepad.axes[3], 'right'
        );
        this.controllerState.triggerValues.left = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
        this.controllerState.triggerValues.right = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
    }

    private getRawStickPosition(rawX: number, rawY: number, stick: 'left' | 'right'): GamepadStick {
        return { x: rawX, y: rawY };
    }

    private updateVisualElements(): void {
        if (!this.controllerState.connected) return;
        this.updateButtonValues();
        this.updateAxisValues();
        this.updateButtonVisuals();
        this.updateStickVisual('left', this.controllerState.stickPositions.left);
        this.updateStickVisual('right', this.controllerState.stickPositions.right);
        this.updatePreviewStick('left');
        this.updatePreviewStick('right');
        this.updateTriggerVisual('l2', this.controllerState.triggerValues.left);
        this.updateTriggerVisual('r2', this.controllerState.triggerValues.right);
    }

    private updateButtonValues(): void {
        if (!this.controllerState.gamepad) return;
        this.controllerState.gamepad.buttons.forEach((button, index) => {
            const valueElement = document.getElementById(`b${index}-value`);
            if (valueElement) {
                valueElement.textContent = button.value.toFixed(2);
                const cellElement = valueElement.parentElement;
                if (cellElement) {
                    if (button.pressed) {
                        cellElement.classList.add('active');
                    } else {
                        cellElement.classList.remove('active');
                    }
                }
            }
        });
    }

    private updateAxisValues(): void {
        if (!this.controllerState.gamepad) return;
        this.controllerState.gamepad.axes.forEach((axisValue, index) => {
            const valueElement = document.getElementById(`axis${index}-value`);
            if (valueElement) {
                valueElement.textContent = axisValue.toFixed(5);
                const cellElement = valueElement.parentElement;
                if (cellElement) {
                    if (Math.abs(axisValue) > 0.1) {
                        cellElement.classList.add('active');
                    } else {
                        cellElement.classList.remove('active');
                    }
                }
            }
        });
    }

    private updateButtonVisuals(): void {
        if (!this.controllerState.gamepad) return;
        this.controllerState.gamepad.buttons.forEach((button, index) => {
            let elementId = '';
            switch(index) {
                case 12: elementId = 'dpad-up'; break;
                case 13: elementId = 'dpad-down'; break;
                case 14: elementId = 'dpad-left'; break;
                case 15: elementId = 'dpad-right'; break;
                case 0: elementId = 'cross'; break;
                case 1: elementId = 'circle'; break;
                case 2: elementId = 'square'; break;
                case 3: elementId = 'triangle'; break;
                case 4: elementId = 'l1'; break;
                case 5: elementId = 'r1'; break;
                case 8: elementId = 'share'; break;
                case 9: elementId = 'options'; break;
                case 16: elementId = 'ps'; break;
            }
            if (elementId) {
                const element = document.getElementById(elementId);
                if (element) {
                    if (button.pressed) {
                        element.classList.add('active');
                    } else {
                        element.classList.remove('active');
                    }
                }
            }
        });
    }

    private updateStickVisual(stick: 'left' | 'right', position: GamepadStick): void {
        const stickCircle = document.getElementById(`${stick}-stick`);
        const stickDot = stickCircle?.querySelector('.stick-dot') as HTMLElement;
        const stickLine = stickCircle?.querySelector('.stick-line') as HTMLElement;
        if (stickDot && this.controllerState.gamepad) {
            const gamepad = this.controllerState.gamepad;
            const rawX = stick === 'left' ? gamepad.axes[0] : gamepad.axes[2];
            const rawY = stick === 'left' ? gamepad.axes[1] : gamepad.axes[3];
            const maxOffset = 50;
            const offsetX = rawX * maxOffset;
            const offsetY = rawY * maxOffset;
            stickDot.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
            stickDot.style.background = 'var(--controller-stick-dot)';
            if (stickLine) {
                const lineDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const angle = Math.atan2(offsetY, offsetX) * (180 / Math.PI);
                stickLine.style.width = `${lineDistance}px`;
                stickLine.style.transform = `rotate(${angle}deg)`;
                stickLine.style.display = lineDistance > 1 ? 'block' : 'none';
                stickLine.style.background = 'var(--text-secondary)';
            }
        }
        if (stickCircle) {
            const gamepad = this.controllerState.gamepad;
            if (gamepad) {
                const stickButtonIndex = stick === 'left' ? 10 : 11;
                if (gamepad.buttons[stickButtonIndex]?.pressed) {
                    stickCircle.classList.add('active');
                } else {
                    stickCircle.classList.remove('active');
                }
            }
        }
    }

    private updatePreviewStick(stick: 'left' | 'right'): void {
        if (!this.controllerState.gamepad) return;
        const gp = this.controllerState.gamepad;
        const rawX = stick === 'left' ? gp.axes[0] : gp.axes[2];
        const rawY = stick === 'left' ? gp.axes[1] : gp.axes[3];
        const dot = document.getElementById(`visual-${stick}-stick`) as HTMLElement | null;
        if (!dot) return;
        const r = this.PREVIEW_MAX_PX;
        let x = rawX * r;
        let y = rawY * r;
        const len = Math.hypot(x, y);
        if (len > r) { 
            x = (x / len) * r; 
            y = (y / len) * r; 
        }
        dot.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        const distance = Math.hypot(rawX, rawY);
        const intensity = Math.min(distance, 1.0);
        if (intensity > 0.1) {
            const grayValue = Math.floor(26 + (intensity * 80));
            dot.style.background = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        } else {
            dot.style.background = 'var(--controller-stick-dot)';
        }
        const ring = dot.closest('.controller-stick-circle');
        const stickBtnIdx = stick === 'left' ? 10 : 11;
        ring?.classList.toggle('active', !!gp.buttons[stickBtnIdx]?.pressed);
    }

    private updateTriggerVisual(trigger: 'l2' | 'r2', value: number): void {
        const triggerButton = document.getElementById(trigger);
        const triggerFill = document.getElementById(`${trigger}-fill`);
        if (triggerFill) {
            triggerFill.style.width = `${value * 100}%`;
        }
        if (triggerButton) {
            if (value > 0.02) {
                triggerButton.classList.add('active');
                const intensity = Math.min(value, 1.0);
                const startR = 42, startG = 42, startB = 42;
                const endR = 0, endG = 120, endB = 212;
                const r = Math.floor(startR + (endR - startR) * intensity);
                const g = Math.floor(startG + (endG - startG) * intensity);
                const b = Math.floor(startB + (endB - startB) * intensity);
                triggerButton.style.background = `rgb(${r}, ${g}, ${b})`;
            } else {
                triggerButton.classList.remove('active');
                triggerButton.style.background = '';
            }
        }
    }

    private resetVisualElements(): void {
        document.querySelectorAll('.active').forEach(element => {
            element.classList.remove('active');
        });
        ['left-stick', 'right-stick'].forEach(id => {
            (document.querySelector(`#${id} .stick-dot`) as HTMLElement)?.style.setProperty('transform', 'translate(-50%, -50%)');
            (document.querySelector(`#${id} .stick-line`) as HTMLElement)?.style.setProperty('display', 'none');
        });
        ['visual-left-stick', 'visual-right-stick'].forEach(id => {
            (document.getElementById(id) as HTMLElement)?.style.setProperty('transform', 'translate(-50%, -50%)');
        });
        const l2Fill = document.getElementById('l2-fill');
        const r2Fill = document.getElementById('r2-fill');
        if (l2Fill) l2Fill.style.width = '0%';
        if (r2Fill) r2Fill.style.width = '0%';
        const leftValues = document.getElementById('left-stick-values');
        const rightValues = document.getElementById('right-stick-values');
        if (leftValues) leftValues.textContent = 'X: 0.00, Y: 0.00';
        if (rightValues) rightValues.textContent = 'X: 0.00, Y: 0.00';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PS5ControllerTester();
});
