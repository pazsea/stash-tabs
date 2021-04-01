<script lang="ts">
  import { onMount } from "svelte";

  interface IStashedItem {
    name: string;
    tabPaths: string[];
  }
  const storageKey = "stashedItems";

  let state: IStashedItem[] = [];
  let alwaysPop = false;
  let text = "";

  onMount(() => {
    const storedStashItems = localStorage.getItem(storageKey);
    window.addEventListener("message", (event) => {
      const stash = event.data; // The json data that the extension sent
      const { name, tabPaths }: IStashedItem = stash.value;
      switch (stash.type) {
        case "add-stash":
          state = [
            { name: name, tabPaths: tabPaths },
            ...state,
          ];
          storeStashedItem(state);
          break;
      }
    });
    if (storedStashItems) {
      state = JSON.parse(storedStashItems);
    }
  });

  const storeStashedItem = (state: IStashedItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  const handleClick = (item: IStashedItem) => {
  console.log("🚀 ~ file: Sidebar.svelte ~ line 30 ~ handleClick ~ item", item)
    if (!item || !item.tabPaths) return;
    tsvscode.postMessage({ type: "onOpenTabs", value: item });
  }

  // onMount(() => {
  //     window.addEventListener("stash", (event) => {
  //         const message = event.data; // The json data that the extension sent
  //         switch (message.type) {
  //             case "new-todo":
  //                 todos = [
  //                     { text: message.value, isOpend: false },
  //                     ...todos,
  //                 ];
  //                 break;
  //         }
  //     });
  // });
</script>

<form
  on:submit|preventDefault={(e) => {
    if (!text) return;
    state = [{ name: text, tabPaths: [] }, ...state];
    text = "";
  }}
>
  <input type="text" bind:value={text} />
</form>

<ul>
  {#each state as item (item.name)}
    <li
      on:click={() => handleClick(item)}
    >
      {item.name}
    </li>
  {/each}
</ul>

<button
  class:alwaysPop
  on:click={() => {
    alwaysPop = !alwaysPop;
  }}
>
  Always pop stashes
</button>

<!-- <button
    on:click={() => {
        tsvscode.addTabs({ type: 'add' });
    }}>Stash open tabs</button> -->

<!-- <button
    on:click={() => {
        tsvscode.addTabs({ type: 'onError', value: 'ERROR MESSAGE' });
    }}>Click me for error</button> -->
<style>
  .alwaysPop {
    background-color: green;
  }
</style>
