<template>
  <div>
    <div v-if="isLoading" class="loading-state">
      <p>Loading...</p>
    </div>
    <div v-else-if="errorState.hasError" class="error-state">
      <p>{{ errorState.message }}</p>
      <button @click="retryInitialization" class="button">Retry</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ErrorState {
  hasError: boolean;
  message: string;
}

interface Props {
  isLoading?: boolean;
  errorState?: ErrorState;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
  errorState: () => ({ hasError: false, message: "" }),
});

// Define emits
const emit = defineEmits<{
  retry: [];
}>();

// Event handlers
function retryInitialization(): void {
  emit("retry");
}
</script>
