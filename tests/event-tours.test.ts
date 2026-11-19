import { describe, expect, it } from 'vitest';
import { asTourTitle, tourProviderOf } from '@/lib/domain/event-tours';

const providers = [{ name: 'Stroll in Jersey', aliases: [] }, { name: 'Jersey Heritage', aliases: [] }, { name: 'Jersey', aliases: [] }];

describe('tours listed as events', () => {
  it('finds the provider whose name opens the title', () => {
    expect(tourProviderOf('Stroll In Jersey Twilight Walk St. Peter Route 2', providers)?.name).toBe('Stroll in Jersey');
    expect(tourProviderOf('Family Day: Christmas Crafts', providers)).toBeNull();
    expect(tourProviderOf('Jersey Bulls v Binfield', providers)).toBeNull();
    expect(tourProviderOf('Jersey Heritage', providers)).toBeNull();
  });
  it('takes the name off the title', () => {
    expect(asTourTitle('Stroll In Jersey Twilight Walk St. Peter Route 2', providers[0]!)).toBe('Twilight Walk St. Peter Route 2');
    expect(asTourTitle('Something Else', providers[0]!)).toBe('Something Else');
  });
});
