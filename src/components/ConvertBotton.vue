<template>
  <button class="convert-botton items-center justify-center cursor-pointer">
    <div class="flex items-center">
      <slot />
    </div>
  </button>

</template>
<style>
  .convert-botton {
    background-image: linear-gradient(#121213, #121213), linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)), linear-gradient(90deg, hsl(0, 100%, 63%), hsl(90, 100%, 63%), hsl(210, 100%, 63%), hsl(195, 100%, 63%), hsl(270, 100%, 63%));
    border: calc(0.08* 1rem) solid transparent;
    background-origin: border-box;
    background-clip: padding-box, border-box, border-box;
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
    background-size: 200%;
    border-radius: 0.375rem;
    white-space: nowrap;
    background-color: transparent;
  }

  .convert-botton:hover {
    transform: scale(1.02);
  }
</style>
