<template>
  <div
    class="dropdown"
    :class="{
      'dropdown--floating': !showInput,
      'dropdown--disabled': disabled,
    }"
    :tabindex="realTabindex"
    @focusin="show()"
    @focusout="focusout($event)"
  >
    <a v-if="showInput" class="dropdown__selected" @click="show()">
      <template v-if="hasValue()">
        <slot name="value">
          <i
            v-if="selectedIcon"
            class="dropdown__selected-icon fas"
            :class="'fa-' + selectedIcon"
          />
          <img
            v-if="selectedImage"
            class="dropdown__selected-image"
            :src="selectedImage"
          />
          {{ selectedName }}
        </slot>
      </template>
      <template v-else>
        <slot name="defaultValue">
          {{ placeholder ? placeholder : $t('action.makeChoice') }}
        </slot>
      </template>
      <i class="dropdown__toggle-icon fas fa-caret-down"></i>
    </a>
    <div
      ref="itemsContainer"
      class="dropdown__items"
      :class="{
        hidden: !open,
        'dropdown__items--fixed': fixedItemsImmutable,
      }"
    >
      <div v-if="showSearch" class="select__search">
        <i class="select__search-icon fas fa-search"></i>
        <input
          ref="search"
          v-model="query"
          type="text"
          class="select__search-input"
          :placeholder="searchText === null ? $t('action.search') : searchText"
          tabindex="0"
          @keyup="search(query)"
        />
      </div>
      <ul
        v-show="hasDropdownItem"
        ref="items"
        v-auto-overflow-scroll
        class="select__items"
        :class="{ 'select__items--no-max-height': fixedItemsImmutable }"
        tabindex=""
      >
        <slot></slot>
      </ul>
      <div v-if="!hasDropdownItem" class="select__items--empty">
        <slot name="emptyState">
          {{ $t('dropdown.empty') }}
        </slot>
      </div>
      <div v-if="showFooter" class="select__footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import dropdown from '@baserow/modules/core/mixins/dropdown'

export default {
  name: 'Dropdown',
  mixins: [dropdown],
}
</script>
