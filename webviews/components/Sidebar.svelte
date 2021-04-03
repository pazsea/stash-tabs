<script lang="ts">
  //   Todo:
  // 1. Fixa id på alla stashade tabs så att den tar bort rätt stashat tabs
  // 2. Always pop stash ska vara en radio button?
  // 3. Pop stash ska funka
  // 4. Öppna rätt filer !!
  import { onMount } from "svelte";

  interface IStashedItem {
    id: string;
    name: string;
    tabPaths: string[];
  }
  const storageKey = "stashedItems";

  let state: IStashedItem[] = [];
  let alwaysPop = false;
  // let text = "";

  onMount(() => {
    const storedStashItems = localStorage.getItem(storageKey);
    if (storedStashItems) {
      state = JSON.parse(storedStashItems);
    }
    window.addEventListener("message", (event) => {
      const stash = event.data; // The json data that the extension sent
      const { name, tabPaths }: IStashedItem = stash.value;
      switch (stash.type) {
        case "add-stash":
          state = [{ name: name, tabPaths: tabPaths, id: uniqueID() }, ...state];
          storeStashedItem(state);
          break;
      }
    });
  });

  const removeStashedItem = (e: MouseEvent, item: IStashedItem) => {
    e.stopPropagation();
    state = state.filter(i => i.id !== item.id)
    console.log(
      "🚀 ~ file: Sidebar.svelte ~ line 39 ~ removeStashedItem ~ state",
      state
    );
    if (!state) return localStorage.removeItem(storageKey);
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  // TODO: Replace with real uuid when launch.
  const uniqueID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  //TODO: Add verify input later
  const clear = () => {
    state = [];
    if (localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
  };

  const storeStashedItem = (state: IStashedItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const handleClick = (item: IStashedItem) => {
    console.log("HERE");
    if (!item || !item.tabPaths) return;
    tsvscode.postMessage({ type: "onOpenTabs", value: item });
  };
</script>

<!-- 
  TODO: Have input for open tabs
  <form
  on:submit|preventDefault={(e) => {
    if (!text) return;
    state = [{ name: text, tabPaths: [] }, ...state];
    text = "";
  }}
>
  <input type="text" bind:value={text} />
</form> -->

<ul>
  {#each state as item, index (index)}
    <li class="stashedItem" on:click={() => handleClick(item)}>
      <div class="stashedItem_container">
        <div>
          {item.name}
        </div>
        <div
          class="deleteContainer"
          on:click={(e) => removeStashedItem(e, item)}
        >
          X
        </div>
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

<button on:click={clear}>Clear</button>

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

  .deleteContainer {
    width: fit-content;
    cursor: pointer;
    padding: 2px;
  }
  .deleteContainer:hover {
    color: red;
  }
  .stashedItem {
    padding: 5px 10px;
    margin: 5px 0;
    border: 1px solid lightslategray;
    background-color: #d9dbf1;
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
    background: #0c7c59;
  }
  .alwaysPop {
    background-color: green;
  }
</style>
