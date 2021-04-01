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
          state = [{ name: name, tabPaths: tabPaths }, ...state];
          storeStashedItem(state);
          break;
      }
    });
    if (storedStashItems) {
      state = JSON.parse(storedStashItems);
    }
  });

  // const clear = () => {
  //   state = [];
  //   if (localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
  // }

  const storeStashedItem = (state: IStashedItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const handleClick = (item: IStashedItem) => {
    console.log(
      "🚀 ~ file: Sidebar.svelte ~ line 30 ~ handleClick ~ item",
      item
    );
    if (!item || !item.tabPaths) return;
    tsvscode.postMessage({ type: "onOpenTabs", value: item });
  };
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
    <li class:stashedItem={true} on:click={() => handleClick(item)}>
      <div class:stashedItem_container={true}>
        <div>
          {item.name}
        </div>
        <div>X</div>
      </div>
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
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .stashedItem {
    padding: 5px 10px;
    margin: 5px 0;
    border: 1px solid lightslategray;
    background-color: #D9DBF1;
    color: black;
  }
  .stashedItem_container {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
  }

  .stashedItem:hover {
    border: 1px solid lightblue;
    color: white;
    background: #0C7C59;
  }
  .alwaysPop {
    background-color: green;
  }
</style>
