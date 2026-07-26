import { API_BASE_URL } from '../api/api';
const API_URL = `${API_BASE_URL}/api/categories`; 
export interface Category {
  id: number;
  parentId: number | null;
  categoryName: string;
  slug: string;
  thumbnailUrl: string;
}

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
};