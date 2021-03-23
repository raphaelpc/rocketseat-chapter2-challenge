import React, { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Identifica estoque disponível
      const response = await api.get(`stock/${productId}`);
      const productStock = response.data as Stock;

      // Verifica se produto já existe no carrinho
      const product = cart.find(p => p.id === productId);

      // Verifica se existe no estoque a quantidade desejada do produto.
      const newProductAmount = product ? product.amount + 1 : 1;
      if (newProductAmount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        let updatedCart = [] as Product[];

        if (product) {
          // Atualiza info do produto no carrinho
          updatedCart = cart.map(p => p.id === productId
            ? {
              ...p,
              amount: newProductAmount,
            }
            : p);
        } else {
          // Insere produto no carrinho
          const response = await api.get(`products/${productId}`);
          const newProduct = response.data as Product;
          updatedCart = [
            ...cart,
            {
              ...newProduct,
              amount: newProductAmount,
            }
          ];
        }

        // Atualiza state
        setCart(updatedCart);

        // Persiste carrinho no localStorage
        const storagedCart = JSON.stringify(updatedCart);
        localStorage.setItem('@RocketShoes:cart', storagedCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(p => p.id === productId);

      // Should not be able to remove a product that does not exist
      if (!product) throw new Error();

      const updatedCart = cart.filter(p => p.id !== productId);

      // Atualiza state
      setCart(updatedCart);

      // Persiste carrinho no localStorage
      const storagedCart = JSON.stringify(updatedCart);
      localStorage.setItem('@RocketShoes:cart', storagedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find(p => p.id === productId);

      // should not be able to update a product that does not exist
      if (!product) throw new Error();

      // Se a quantidade do produto for menor ou igual a zero,
      // sair da função **updateProductAmount** instantâneamente.
      if (amount <= 0) return;

      // Verificar se existe no estoque a quantidade desejada do produto.
      const response = await api.get(`stock/${productId}`);
      const productStock = response.data as Stock;

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        // Atualiza info do produto no carrinho
        const updatedCart = cart.map(p => p.id === productId
          ? {
            ...p,
            amount,
          }
          : p);

        // Atualiza state
        setCart(updatedCart);

        // Persiste carrinho no localStorage
        const storagedCart = JSON.stringify(updatedCart);
        localStorage.setItem('@RocketShoes:cart', storagedCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        removeProduct,
        updateProductAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
