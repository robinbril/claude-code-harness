<script setup lang="ts">
/**
 * ThemeToggle — topbar theme menu on the existing theme system.
 * Light / Dark apply the default preset of that mode; System follows
 * prefers-color-scheme via followSystem(); Advanced opens the Appearance
 * modal (same action as the Settings-hub card). applyTheme stays the
 * only token writer, so this menu and the Settings picker cannot drift.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "./Icon.vue";
import { useSettings } from "../composables/useSettings";
import {
  activeThemeId,
  applyTheme,
  DEFAULT_ID,
  followSystem,
  followsSystem,
  LIGHT_DEFAULT_ID,
  presetIsDark,
} from "../composables/useTheme";

const { t } = useI18n();
const settings = useSettings();

type ModeChoice = "light" | "dark" | "system";

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const isDark = computed(() => presetIsDark(activeThemeId.value));
const activeChoice = computed<ModeChoice>(() => {
  if (followsSystem.value) return "system";
  return isDark.value ? "dark" : "light";
});
const triggerIcon = computed<ModeChoice>(() => activeChoice.value);

function closeMenu(): void {
  open.value = false;
}
function toggleMenu(): void {
  open.value = !open.value;
}

function pickMode(choice: ModeChoice): void {
  if (choice === "system") followSystem();
  else applyTheme(choice === "dark" ? DEFAULT_ID : LIGHT_DEFAULT_ID);
  closeMenu();
}

function openAdvanced(): void {
  closeMenu();
  settings.open();
}

function onDocClick(e: MouseEvent): void {
  if (root.value && !root.value.contains(e.target as Node)) closeMenu();
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    closeMenu();
  }
}
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeydown);
  } else {
    document.removeEventListener("mousedown", onDocClick);
    document.removeEventListener("keydown", onKeydown);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div ref="root" class="themetoggle-wrap">
    <button
      class="iconbtn themetoggle"
      type="button"
      data-tour-step="thema"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('topbar.themeToggle')"
      v-tip="t('topbar.themeToggle')"
      @click="toggleMenu"
    >
      <span class="themetoggle__stage" aria-hidden="true">
        <!-- sun -->
        <svg
          class="themetoggle__icon"
          :class="{ 'is-on': triggerIcon === 'light' }"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
        </svg>
        <!-- moon -->
        <svg
          class="themetoggle__icon"
          :class="{ 'is-on': triggerIcon === 'dark' }"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
        </svg>
        <!-- monitor -->
        <svg
          class="themetoggle__icon"
          :class="{ 'is-on': triggerIcon === 'system' }"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </span>
    </button>

    <transition name="themetoggle-pop">
      <div
        v-if="open"
        class="themetoggle__panel"
        role="menu"
        :aria-label="t('topbar.themeToggle')"
        @click.stop
      >
        <button
          type="button"
          class="themetoggle__item"
          role="menuitemradio"
          :aria-checked="activeChoice === 'light'"
          :class="{ 'is-on': activeChoice === 'light' }"
          @click="pickMode('light')"
        >
          <span class="themetoggle__item-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
            </svg>
          </span>
          <span class="themetoggle__item-lbl">{{ t("topbar.themeMenu.light") }}</span>
          <Icon v-if="activeChoice === 'light'" name="check" :size="14" class="themetoggle__check" />
        </button>
        <button
          type="button"
          class="themetoggle__item"
          role="menuitemradio"
          :aria-checked="activeChoice === 'dark'"
          :class="{ 'is-on': activeChoice === 'dark' }"
          @click="pickMode('dark')"
        >
          <span class="themetoggle__item-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
            </svg>
          </span>
          <span class="themetoggle__item-lbl">{{ t("topbar.themeMenu.dark") }}</span>
          <Icon v-if="activeChoice === 'dark'" name="check" :size="14" class="themetoggle__check" />
        </button>
        <button
          type="button"
          class="themetoggle__item"
          role="menuitemradio"
          :aria-checked="activeChoice === 'system'"
          :class="{ 'is-on': activeChoice === 'system' }"
          @click="pickMode('system')"
        >
          <span class="themetoggle__item-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </span>
          <span class="themetoggle__item-lbl">{{ t("topbar.themeMenu.system") }}</span>
          <Icon v-if="activeChoice === 'system'" name="check" :size="14" class="themetoggle__check" />
        </button>

        <div class="themetoggle__divider" role="separator"></div>

        <button type="button" class="themetoggle__item" role="menuitem" @click="openAdvanced">
          <span class="themetoggle__item-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </span>
          <span class="themetoggle__item-lbl">{{ t("topbar.themeMenu.advanced") }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.themetoggle-wrap {
  position: relative;
  display: inline-flex;
}

/* AppTopbar's scoped `.topbar .iconbtn` override cannot reach into this child
   component, so mirror it here: without this the global 38px pill wins and the
   trigger reads as a different shape than its topbar siblings. */
.themetoggle.iconbtn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--shell-border);
  border-radius: var(--r-md);
  background: var(--shell-field);
  color: var(--shell-text);
  transition: background var(--dur-fast), color var(--dur-fast),
    border-color var(--dur-fast), transform var(--dur-fast);
}
.themetoggle.iconbtn:hover {
  background: var(--shell-field-strong);
  color: var(--shell-text-strong);
}
.themetoggle.iconbtn:active { transform: scale(0.94); }
.themetoggle.iconbtn:focus-visible { outline: none; box-shadow: var(--ring); }

/* Invisible 44x44 tap target around the 34px iconbtn, same visual as siblings. */
.themetoggle::after {
  content: "";
  position: absolute;
  inset: -5px;
}

.themetoggle__stage {
  position: relative;
  width: 16px;
  height: 16px;
  display: block;
}
.themetoggle__icon {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
  transition:
    opacity var(--dur-enter, 280ms) var(--spring, ease),
    transform var(--dur-enter, 280ms) var(--spring, ease);
}
.themetoggle__icon.is-on {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.themetoggle__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  min-width: 196px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--e2);
  transform-origin: top right;
}
.themetoggle__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 7px 8px;
  border-radius: var(--r-sm);
  font-family: var(--font);
  font-size: var(--fs-sm);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast);
}
.themetoggle__item:hover,
.themetoggle__item:focus-visible {
  outline: none;
  background: var(--surface-2);
}
.themetoggle__item-ico {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  color: var(--text-2);
}
.themetoggle__item.is-on .themetoggle__item-ico {
  color: var(--brand-strong);
}
.themetoggle__item-lbl {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}
.themetoggle__check {
  flex: none;
  color: var(--brand-strong);
}
.themetoggle__divider {
  height: 1px;
  background: var(--border);
  margin: 4px 2px;
}

.themetoggle-pop-enter-active {
  transition: opacity var(--dur-fast), transform var(--dur-enter, 220ms) var(--spring, cubic-bezier(0.22, 1, 0.36, 1)), filter var(--dur-enter, 220ms);
}
.themetoggle-pop-leave-active {
  transition: opacity var(--dur-fast), transform 140ms ease;
}
.themetoggle-pop-enter-from {
  opacity: 0;
  transform: scale(0.94) translateY(-2px);
  filter: blur(4px);
}
.themetoggle-pop-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .themetoggle__icon {
    transition: none;
  }
  .themetoggle-pop-enter-active,
  .themetoggle-pop-leave-active {
    transition: opacity 120ms ease;
  }
  .themetoggle-pop-enter-from,
  .themetoggle-pop-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
