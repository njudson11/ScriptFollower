# Sidebar.vue

## Purpose

The `Sidebar.vue` component provides a secondary view of the document, displaying a filtered list of items such as headings, sounds, and other important markers. It allows the user to quickly navigate to different parts of the document and provides controls for interacting with sounds.

## Functionality

### Props

- `lines`: An array of line objects, where each object represents a line in the document.
- `activeLineIdx`: The index of the currently active line in the document.
- `onSelectUserLine`: A function that is called when the user clicks on an item in the sidebar.
- `playingAudios`: An object that contains information about the currently playing sounds.
- `soundManager`: An object that manages the playback of sounds.
- `state`: An object that holds the current state of the application.
- `style`: An object that contains the CSS styles for the sidebar.
- `onToggleSidebar`: A function that is called when the user clicks the "hide sidebar" button.

### Template

- The component displays a set of checkboxes that allow the user to filter the sidebar items by type.
- It iterates through the `sidebarItems` array and renders each item as a `div` element.
- Each item has a `click` event handler that calls the `selectSidebarItem` function with the item's data.
- The `:class` binding is used to apply different CSS classes to the items based on their state:
    - `selected`: The item that is currently selected.
    - `nextSidebarItem`: The next item in the sidebar, relative to the currently active line.
- If an item is of type `SOUND`, it will display a button for playing or stopping the sound.

### Script

- The `setup` function defines the component's props and a `sidebarTypes` object that maps sidebar item types to their labels and styles.
- The `visibleTypes` ref is used to store the user's filter preferences.
- The `sidebarItems` ref is a computed property that returns a filtered and sorted list of sidebar items based on the `lines` prop and the `visibleTypes` ref.
- The component uses `watch` to monitor changes to the `lines` prop and the `visibleTypes` ref, and updates the `sidebarItems` ref accordingly.
- The `selectSidebarItem` function is called when the user clicks on a sidebar item, and it calls the `onSelectUserLine` prop to update the active line in the main document view.
- The `getSidebarItemStyle` function calculates the appropriate indentation for each sidebar item based on its `level` property.
- The `getSoundProgressBar` function calculates the progress of a sound and returns a `linear-gradient` to visualize it.
- The `getNextItemGradient` function creates a gradient to visualize the proximity to the next item.
- The `scrollToLineIndex` function scrolls the sidebar to the currently active line.

### Styling

- The component's styles are imported from `../css/sidebar.css`.
