<script lang="ts">
  import { onMount } from "svelte";

  interface IStashedItem {
    id: string;
    name: string;
    tabPaths: string[];
  }

  let state: IStashedItem[] = [];
  let popState = 0;
  let confirmDelete = false;
  let inputValue = "";

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
          break;
      }
    });
  });

  const removeStashedItem = (item: IStashedItem, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    state = state.filter((i) => i.id !== item.id);
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
      confirmDelete = false;
    }
  };

  const handleClick = (item: IStashedItem) => {
    if (!item || !item.tabPaths) return;
    if (popState === 1) removeStashedItem(item);
    tsvscode.postMessage({ type: "onOpenTabs", value: item });
  };

  const handleConfirmedInput = (e: Event) => {
    if (!inputValue) return;
    e.preventDefault();
    tsvscode.postMessage({ type: "onAddStash", value: inputValue });
    inputValue = "";
  };
</script>

<h3 class="title">Enter stash name:</h3>
<form on:submit|preventDefault={(e) => handleConfirmedInput(e)}>
  <input type="text" bind:value={inputValue} />
</form>

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

<hr />

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

<button
  class={confirmDelete ? "confirmDeleteColor" : ""}
  on:click={toggleConfirmOrDelete}
>
  {confirmDelete ? "Nuke all? Click again!💣" : "Delete all stash"}
</button>

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
