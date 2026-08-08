import toast from 'react-hot-toast';

export const showCartAddedToast = (productName, isNew, totalItems) => {
  if (isNew) {
    toast.success(`🛒 ${productName} added to cart! (Total: ${totalItems} items)`);
  } else {
    toast.success(`🔄 ${productName} quantity increased! (Total: ${totalItems} items)`);
  }
};