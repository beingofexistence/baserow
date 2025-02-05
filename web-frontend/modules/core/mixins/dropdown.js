import {
  isDomElement,
  isElement,
  onClickOutside,
} from '@baserow/modules/core/utils/dom'

import dropdownHelpers from './dropdownHelpers'

export default {
  mixins: [dropdownHelpers],
  props: {
    value: {
      type: [String, Number, Boolean, Object],
      required: false,
      default: null,
    },
    searchText: {
      type: [String, null],
      required: false,
      default: null,
    },
    placeholder: {
      type: [String, null],
      required: false,
      default: null,
    },
    showSearch: {
      type: Boolean,
      required: false,
      default: true,
    },
    showInput: {
      type: Boolean,
      required: false,
      default: true,
    },
    showFooter: {
      type: Boolean,
      required: false,
      default: false,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    tabindex: {
      type: Number,
      required: false,
      default: 0,
    },
    /**
     * If this property is true, it will position the items element fixed. This can be
     * useful if the parent element has an `overflow: hidden|scroll`, and you still
     * want the dropdown to break out of it. This property is immutable, so changing
     * it afterwards has no point.
     */
    fixedItems: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      loaded: false,
      open: false,
      name: null,
      icon: null,
      query: '',
      hasItems: true,
      hasDropdownItem: true,
      hover: null,
      fixedItemsImmutable: this.fixedItems,
    }
  },
  computed: {
    selectedName() {
      return this.getSelectedProperty(this.value, 'name')
    },
    selectedIcon() {
      return this.getSelectedProperty(this.value, 'icon')
    },
    selectedImage() {
      return this.getSelectedProperty(this.value, 'image')
    },
    realTabindex() {
      // We don't want to be able focus if the dropdown is disabled or if we have
      // opened it and the search input is currently focused
      if (this.disabled || (this.open && this.showSearch)) {
        return ''
      }
      return this.tabindex
    },
  },
  watch: {
    value() {
      this.$nextTick(() => {
        // When the value changes we want to forcefully reload the selectName and
        // selectedIcon a little bit later because the children might have changed.
        this.forceRefreshSelectedValue()
      })
    },
  },
  mounted() {
    // When the component is mounted we want to forcefully reload the selectedName and
    // selectedIcon.
    this.forceRefreshSelectedValue()

    // The child dropdown item components determine what the possible options are.
    // Because is not no "Vue way" of watching these components, we're using the
    // mutation observer to monitor changes. This is needed because we need to
    // update the select value display value.
    this.observer = new MutationObserver(() => {
      this.forceRefreshSelectedValue()
    })
    this.observer.observe(this.$refs.items, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: false,
    })
  },
  beforeDestroy() {
    this.observer.disconnect()
  },
  methods: {
    getDropdownItemComponents() {
      return this.$children.filter((child) => child.isDropdownItem === true)
    },
    focusout(event) {
      // Hide only if we loose focus in favor of another element which is not a
      // child of this one. This will make sure the `show` and `hide` will not be
      // called multiple times when the search of being focussed on immediately
      // after opening.
      if (event.relatedTarget && !isElement(this.$el, event.relatedTarget)) {
        this.hide()
      }
    },
    /**
     * Toggles the open state of the dropdown menu.
     */
    toggle(target, value) {
      if (value === undefined) {
        value = !this.open
      }

      if (value) {
        this.show(target)
      } else {
        this.hide()
      }
    },
    /**
     * Shows the lists of choices, so a user can change the value.
     */
    show(target) {
      if (this.disabled || this.open) {
        return
      }

      const isElementOrigin = isDomElement(target)

      this.open = true
      this.hover = this.value
      this.opener = isElementOrigin ? target : null
      this.$emit('show')

      this.hasDropdownItem = this.getDropdownItemComponents().length > 0

      this.$nextTick(() => {
        // We have to wait for the input to be visible before we can focus.
        this.showSearch && this.$refs.search.focus()

        // Scroll to the selected child.
        this.getDropdownItemComponents().forEach((child) => {
          if (child.value === this.value) {
            // This is a bit of weird scenario. This $refs.items uses the
            // `v-auto-overflow-scroll` directive. That one uses the resize observer
            // to detect if the element needs a scrollbar. This one has not fired before
            // this part of the code runs, resulting in no scrollbar. After it will
            // run, it can create a scrollbar, which changes the `offsetTop` values, and
            // will therefore not scroll to the correct item. Running this function
            // in advance will make sure that the scrollbar is added immediately if
            // needed, `offsetTop` are going to be correct.
            this.$refs.items.autoOverflowScrollHeightObserverFunction?.()

            const childTop = child.$el.offsetTop
            const childBottom = child.$el.offsetTop + child.$el.clientHeight
            const itemsScrollTop = this.$refs.items.scrollTop
            const itemsScrollBottom =
              this.$refs.items.scrollTop + this.$refs.items.clientHeight

            if (childTop < itemsScrollTop) {
              // If the selected item is above the visible scroll area, we want to
              // change the scroll offset, so that the item is visible at the top.
              this.$refs.items.scrollTop = child.$el.offsetTop - 10
            } else if (childBottom > itemsScrollBottom) {
              // If the selected item is below the visible scroll area, we want to
              // change the scroll offset, so that the item is visible at the bottom.
              this.$refs.items.scrollTop =
                child.$el.offsetTop -
                this.$refs.items.clientHeight +
                child.$el.clientHeight +
                10
            }
          }
        })
      })

      // If the user clicks outside the dropdown while the list of choices of open we
      // have to hide them.
      const clickOutsideEventCancel = onClickOutside(this.$el, (target) => {
        if (
          // Check if the context menu is still open
          this.open &&
          // If the click was not on the opener because they can trigger the toggle
          // method.
          !isElement(this.opener, target)
        ) {
          this.hide()
        }
      })
      this.$once('hide', clickOutsideEventCancel)

      const keydownEvent = (event) => {
        if (
          // Check if the context menu is still open
          this.open &&
          // Check if the user has hit either of the keys we care about. If not,
          // ignore.
          (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ) {
          // Prevent scrolling up and down while pressing the up and down key.
          event.stopPropagation()
          event.preventDefault()
          this.handleUpAndDownArrowPress(event)
        }
        // Allow the Enter key to select the value that is currently being hovered
        // over.
        if (this.open && event.key === 'Enter') {
          // Prevent submitting the whole form when pressing the enter key while the
          // dropdown is open.
          event.preventDefault()
          this.select(this.hover)
        }
        // Close on escape
        if (this.open && event.key === 'Escape') {
          this.hide()
        }
      }
      document.body.addEventListener('keydown', keydownEvent)
      this.$once('hide', () => {
        document.body.removeEventListener('keydown', keydownEvent)
      })

      if (this.fixedItemsImmutable) {
        const updatePosition = () => {
          const element = this.$refs.itemsContainer
          const targetRect = this.$el.getBoundingClientRect()
          element.style.top = targetRect.top + 'px'
          element.style.left = targetRect.left + 'px'
          element.style['min-width'] = targetRect.width + 'px'
          element.style['max-height'] = `calc(100vh - ${targetRect.top + 20}px)`
        }

        // Delay the position update to the next tick to let the Context content
        // be available in DOM for accurate positioning.
        this.$nextTick(() => {
          updatePosition()

          window.addEventListener('scroll', updatePosition, true)
          window.addEventListener('resize', updatePosition)
          this.$once('hide', () => {
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
          })
          this.$once('hook:beforeDestroy', () => {
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
          })
        })
      }
    },
    /**
     * Hides the list of choices. If something change in this method, you might need
     * to update the hide method of the `PaginatedDropdown` component because it
     * contains a partial copy of this code.
     */
    hide() {
      if (this.disabled || !this.open) {
        return
      }

      this.open = false
      this.$emit('hide')

      // Make sure that all the items are visible the next time we open the dropdown.
      this.query = ''
      this.search(this.query)
    },
    /**
     * Selects a new value which will also be
     */
    select(value) {
      this.$emit('input', value)
      this.$emit('change', value)
      this.hide()
    },
    /**
     * If not empty it will only show children that contain the given query.
     */
    search(query) {
      this.hasItems = query === ''
      this.getDropdownItemComponents().forEach((item) => {
        if (item.search(query)) {
          this.hasItems = true
        }
      })
    },
    /**
     * Loops over all children to see if any of the values match with given value. If
     * so the requested property of the child is returned
     */
    getSelectedProperty(value, property) {
      for (const i in this.getDropdownItemComponents()) {
        const item = this.getDropdownItemComponents()[i]
        if (item.value === value) {
          return item[property]
        }
      }
      return ''
    },
    /**
     * Returns true if there is a value.
     * @return {boolean}
     */
    hasValue() {
      for (const i in this.getDropdownItemComponents()) {
        const item = this.getDropdownItemComponents()[i]
        if (item.value === this.value) {
          return true
        }
      }
      return false
    },
    /**
     * A nasty hack, but in some cases the dropdownItemComponents have not yet been loaded when the
     * `selectName` and `selectIcon` are computed. This would result in an empty
     * initial value of the Dropdown because the correct value can't be extracted from
     * the DropdownItem. With this hack we force the computed properties to recompute
     * when the component is mounted. At this moment the dropdownItemComponents have been added.
     */
    forceRefreshSelectedValue() {
      this._computedWatchers.selectedName.run()
      this._computedWatchers.selectedIcon.run()
      this.$forceUpdate()
    },
    /**
     * Method that is called when the arrow up or arrow down key is pressed. Based on
     * the index of the current child, the next child enabled child is set as hover.
     */
    handleUpAndDownArrowPress(event) {
      const children = this.getDropdownItemComponents().filter(
        (child) => !child.disabled && child.isVisible(this.query)
      )

      const isArrowUp = event.key === 'ArrowUp'
      let index = children.findIndex((item) => item.value === this.hover)
      index = isArrowUp ? index - 1 : index + 1

      // Check if the new index is within the allowed range.
      if (index < 0 || index > children.length - 1) {
        return
      }

      const next = children[index]
      this.hover = next.value
      this.$refs.items.scrollTop = this.getScrollTopAmountForNextChild(
        next,
        isArrowUp
      )
    },
    /**
     * This method calculates the expected container scroll top offset if the next
     * child is selected. This is for example used when navigating with the arrow keys.
     * If the element to scroll to is below the current dropdown's bottom scroll
     * position, then scroll so that the item to scroll to is the last visible item
     * in the dropdown window. Conversely if the element to scroll to is above the
     * current dropdown's top scroll position then scroll so that the item to scroll
     * to is the first viewable item in the dropdown window.
     */
    getScrollTopAmountForNextChild(itemToScrollTo, isArrowUp) {
      const {
        parentContainerHeight,
        parentContainerAfterHeight,
        parentContainerBeforeHeight,
        itemHeightWithMargins,
        itemMarginTop,
        itemsInView,
      } = this.getStyleProperties(this.$refs.items, itemToScrollTo.$el)

      // Get the direction of the scrolling.
      const movingDownwards = !isArrowUp
      const movingUpwards = isArrowUp

      // nextItemOutOfView can be used if one wants to check if the item to scroll
      // to is out of view of the current dropdowns bottom scroll position.
      // This happens when the difference between the element to scroll to's
      // offsetTop and the current scrollTop of the dropdown is smaller than height
      // of the dropdown minus the full height of the element
      const nextItemOutOfView =
        itemToScrollTo.$el.offsetTop - this.$refs.items.scrollTop >
        parentContainerHeight - itemHeightWithMargins

      // prevItemOutOfView can be used if one wants to check if the item to scroll
      // to is out of view of the current dropdowns top scroll position.
      // This happens when the element to scroll to's offsetTop is smaller than the
      // current scrollTop of the dropdown
      const prevItemOutOfView =
        itemToScrollTo.$el.offsetTop < this.$refs.items.scrollTop

      // When the user is scrolling downwards (i.e. pressing key down)
      // and the itemToScrollTo is out of view we want to add the height of the
      // elements preceding the itemToScrollTo plus the parentContainerBeforeHeight.
      // This can be achieved by removing said heights from the itemToScrollTo's
      // offsetTop
      if (nextItemOutOfView && movingDownwards) {
        const elementsHeightBeforeItemToScrollTo =
          itemHeightWithMargins * (itemsInView - 1)

        return (
          itemToScrollTo.$el.offsetTop -
          elementsHeightBeforeItemToScrollTo -
          parentContainerBeforeHeight
        )
      }

      // When the user is scrolling upwards (i.e. pressing key up) and the
      // itemToScrollTo is out of view we want to set the scrollPosition to be the
      // offsetTop of the element minus it's top margin and the height of the
      // ::after pseudo element of the ref items element
      if (prevItemOutOfView && movingUpwards) {
        return (
          itemToScrollTo.$el.offsetTop -
          itemMarginTop -
          parentContainerAfterHeight
        )
      }

      // In the case that the next item to scroll to is completely visible we simply
      // return the current scroll position so that no scrolling happens
      return this.$refs.items.scrollTop
    },
  },
}
