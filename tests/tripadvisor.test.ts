import { describe, expect, it } from 'vitest';
import { tripadvisorId } from '@/lib/integrations/jersey-com/parse';
import { fromDetails } from '@/lib/integrations/tripadvisor/ratings';

describe('Tripadvisor', () => {
  it('takes the listing number Visit Jersey gives, not a placeholder', () => {
    expect(tripadvisorId('21316433')).toBe('21316433');
    expect(tripadvisorId('0193246')).toBe('193246');
    expect(tripadvisorId('00000181')).toBeNull();
    expect(tripadvisorId('')).toBeNull();
    expect(tripadvisorId(null)).toBeNull();
  });
  it('reads a rating from the details response', () => {
    expect(fromDetails({ rating: '4.5', num_reviews: '1234', web_url: 'https://www.tripadvisor.co.uk/x', rating_image_url: 'https://static.tacdn.com/4.5.svg' }))
      .toEqual({ rating: 4.5, reviews: 1234, url: 'https://www.tripadvisor.co.uk/x', ratingImage: 'https://static.tacdn.com/4.5.svg' });
    expect(fromDetails({ error: { message: 'not found' } })).toBeNull();
    expect(fromDetails({ rating: '0', web_url: 'x' })).toBeNull();
  });
});
