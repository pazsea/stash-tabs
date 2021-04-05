<script lang="ts">
  import { onMount } from "svelte";

  interface IStashedItem {
    id: string;
    name: string;
    tabPaths: string[];
  }
  const storageKey = "stashedItems";
  const popStashKey = "popState";

  let state: IStashedItem[] = localStorage.getItem(storageKey)
    ? JSON.parse(localStorage.getItem(storageKey) as string)
    : [];
  let popState = localStorage.getItem(popStashKey)
    ? Number(JSON.parse(localStorage.getItem(popStashKey) as string))
    : 0;
  let confirmDelete = false;
  $: storePopState(popState);

  onMount(() => {
    window.addEventListener("message", (event) => {
      const stash = event.data; // The json data that the extension sent
      const { name, tabPaths }: IStashedItem = stash.value;
      switch (stash.type) {
        case "add-stash":
          state = [
            { name: name, tabPaths: tabPaths, id: uniqueID() },
            ...state,
          ];
          storeStashedItem(state);
          break;
      }
    });
  });

  const removeStashedItem = (item: IStashedItem, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    state = state.filter((i) => i.id !== item.id);
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

  const toggleConfirmOrDelete = () => {
    if (!confirmDelete) {
      confirmDelete = true;
    } else {
      state = [];
      if (localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
      if (localStorage.getItem(popStashKey))
        localStorage.removeItem(popStashKey);
      confirmDelete = false;
    }
  };

  const storeStashedItem = (state: IStashedItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const storePopState = (key: number) => {
    localStorage.setItem(popStashKey, JSON.stringify(key));
  };

  const handleClick = (item: IStashedItem) => {
    if (!item || !item.tabPaths) return;
    if (popState === 1) removeStashedItem(item);
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

<h3 class="title">Stashed tabs:</h3>
<ul>
  {#each state as item, index (index)}
    <li class="stashedItem" on:click={() => handleClick(item)}>
      <div class="stashedItem_container">
        <div>
          {item.name}
        </div>
        <div
          class="deleteContainer"
          on:click={(e) => removeStashedItem(item, e)}
        >
          X
        </div>
      </div>
    </li>
  {:else}
    <p class={"status"}>You have no stashed tabs..</p>
  {/each}
</ul>

<button
  class={confirmDelete ? "confirmDeleteColor" : ""}
  on:click={toggleConfirmOrDelete}
>
  {confirmDelete ? "Are you sure?" : "Delete all stash"}
</button>

<h3 class="title">Always pop stash?</h3>
<div class="radioContainer">
  <div>
    <input
      type="radio"
      bind:group={popState}
      value={1}
      on:click={() => (popState = 1)}
      class="radioContainer_button"
    /><slot>Yes</slot>
  </div>
  <div>
    <input
      type="radio"
      bind:group={popState}
      value={0}
      on:click={() => (popState = 0)}
      class="radioContainer_button"
    />
    <slot>No</slot>
  </div>
</div>

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

  .title {
    font-weight: bold;
    text-align: center;
  }

  .status {
    text-align: center;
    font-style: italic;
    padding: 10px 0;
  }

  .radioContainer {
    display: flex;
    justify-content: space-evenly;
    margin-bottom: 10px;
  }

  .radioContainer_button {
    width: fit-content;
  }

  .confirmDeleteColor {
    background-color: red;
    color: white;
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
    cursor: pointer;
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
</style>
