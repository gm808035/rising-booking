const {
  updateBoxSlot,
  updateLinkedBoxSlot,
  createBoxSlots,
  filter,
  createLinkedBoxSlots,
  deleteBoxSlots,
  deleteBoxSlotLink,
} = require("../services/boxSlots");

const updateHandler = async (event) => updateBoxSlot(event);
const updateHandlerLinkedSlot = async (event) => updateLinkedBoxSlot(event);
const createHandler = async (event) => createBoxSlots(event);
const createLinkedHandler = async (event) => createLinkedBoxSlots(event);
const filterHandler = async (event) => filter(event);
const deleteHandler = async (event) => deleteBoxSlots(event);
const deleteLinkedSlot = async (event) => deleteBoxSlotLink(event);

module.exports = {
  updateHandler,
  updateHandlerLinkedSlot,
  createHandler,
  filterHandler,
  createLinkedHandler,
  deleteHandler,
  deleteLinkedSlot,
};
