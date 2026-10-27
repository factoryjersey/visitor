-- One-off: fold the 25 print-era duplicate venues into their Visit Jersey records.
-- Nothing is deleted: each duplicate is renamed (-merged), hidden and noted, and its
-- old address redirects to the record kept. Only duplicates not yet merged are touched,
-- so running it again changes nothing.
CREATE TEMP TABLE IF NOT EXISTS merge_pairs(dup uuid, keep uuid);--> statement-breakpoint
insert into merge_pairs values ('77690086-44a8-4583-802a-92c44272af99'::uuid,'6e6fcb42-2fcf-4de7-b87a-c63d5ec5d02c'::uuid),('333953d1-3398-49f4-af60-ca2dbb00671d'::uuid,'957df8e9-6f58-4674-8076-87a0914b23ab'::uuid),('8743a640-dfb7-4d2b-82c4-cfdfd382febd'::uuid,'bce569f0-261f-4f9b-b02f-286bf943402d'::uuid),('89545493-8216-4d09-9fa3-0c2f1f52040b'::uuid,'c1377777-d20e-4ab9-9328-558165d3568c'::uuid),('4aa68c52-2c19-4b55-861d-660412a36387'::uuid,'3f04b611-972f-4f01-8ee5-9270a7ddb171'::uuid),('272ff1d3-3530-4714-8636-6fce831e7e14'::uuid,'5518d4e2-2505-4f97-9b9e-001b9e08295a'::uuid),('72fedffd-60ab-4529-a6a3-f6be60a8b712'::uuid,'047a068c-7b51-44ab-b9e3-1dd1cfd08229'::uuid),('54f51ed0-8555-4bad-91f5-60b288fa9a23'::uuid,'3dda2d31-24d8-4e71-9d3b-eea16a6b7af9'::uuid),('e13a8694-d755-4dc5-bd28-1f4e158a4b11'::uuid,'c58f3432-0cbc-4de1-861c-e51af692e741'::uuid),('1b85aca6-65b5-403e-94cb-eeac185dee77'::uuid,'89734627-1067-4be2-9639-ef9b07ddf5b4'::uuid),('75bc99d7-5e70-4055-af99-0125b1fd1339'::uuid,'696a27ac-4619-4aea-9607-1956bf7bc42d'::uuid),('0d8e24ff-1564-4ad3-a5a3-eb430aeb552f'::uuid,'cdf46a87-74d0-4b34-a31a-c15fbc4b6526'::uuid),('34a945f4-c3bd-4433-9fc4-636b4a23eb10'::uuid,'aee3b680-4673-493a-8689-8affa131e429'::uuid),('19ca5213-151e-4c39-9278-be20aa17af21'::uuid,'6388ef24-8520-432a-9a14-013187f61c9e'::uuid),('a76d13e2-c451-434e-ba00-c28fd0065bd0'::uuid,'b5ad9148-7c0c-464e-97cf-5cf866a71f5c'::uuid),('cf1e6102-2f9b-4642-93b3-f4220ce4c49d'::uuid,'23d4eab5-0ac7-42c2-a437-eb1360dd103a'::uuid),('d7872fb5-52e7-4fd8-916e-3a10b223b5b6'::uuid,'c5452230-f626-44d7-b6a2-7d20ebdfbfbf'::uuid),('91238c36-9c96-4bcc-844a-1ed46a1c5c05'::uuid,'6dc2049a-da8a-4ef5-b26d-0a704dcabf34'::uuid),('96a70d63-dc52-4707-80a2-ce28d251d760'::uuid,'a7637916-8e55-4f4c-8c15-aa4fcd000fea'::uuid),('ace53144-3000-4f71-b981-9c71b1473307'::uuid,'fd9f0d1a-cc25-4163-8f17-2231484640b0'::uuid),('b7adcd2f-3d52-4d73-aaae-f703c5410944'::uuid,'3f1fd747-9fc5-4851-bff6-33da3b6dfedd'::uuid),('2ae3de4f-9d9d-4d04-95a9-e5f308362f96'::uuid,'620ff804-0841-4766-9d52-9577834704c5'::uuid),('5195d666-356d-4602-bfa5-59a525acf6d4'::uuid,'c8079346-24e6-471d-923a-a006fafb45cb'::uuid),('60f4c67c-1010-459c-97a2-f599e8b96c3c'::uuid,'2ebfc7ea-de13-473e-8d02-cb19d5053510'::uuid),('71726586-8aef-43a1-82d8-f46debe4eb0a'::uuid,'5b7c8bdd-00a3-4ca7-8d57-19413d699e5a'::uuid);--> statement-breakpoint
delete from merge_pairs where not exists (select 1 from places where id = merge_pairs.dup and slug not like '%-merged');--> statement-breakpoint
update places k set
  guide_copy = coalesce(nullif(d.guide_copy,''), k.guide_copy),
  guide_section = coalesce(nullif(d.guide_section,''), k.guide_section),
  guide_area = coalesce(nullif(d.guide_area,''), k.guide_area),
  guide_label = coalesce(nullif(d.guide_label,''), k.guide_label),
  guide_line = coalesce(k.guide_line, d.guide_line),
  listing_size = case when array_position(array['directory','listing','quarter','half','three-quarters','full'], d.listing_size) > array_position(array['directory','listing','quarter','half','three-quarters','full'], k.listing_size) then d.listing_size else k.listing_size end,
  space_by_edition = d.space_by_edition || k.space_by_edition,
  visitor_map = coalesce(k.visitor_map, d.visitor_map),
  recommended_in = coalesce(d.recommended_in, k.recommended_in),
  client = k.client or d.client,
  client_note = coalesce(k.client_note, d.client_note),
  inclusion = case when k.inclusion = 'candidate' and d.inclusion <> 'candidate' then d.inclusion else k.inclusion end,
  inclusion_note = coalesce(k.inclusion_note, d.inclusion_note),
  inclusion_set_by = coalesce(k.inclusion_set_by, d.inclusion_set_by),
  inclusion_set_at = coalesce(k.inclusion_set_at, d.inclusion_set_at),
  business_id = coalesce(k.business_id, d.business_id),
  former_slugs = array(select distinct unnest(k.former_slugs || d.former_slugs || array[d.slug])),
  updated_at = now()
from merge_pairs join places d on d.id = merge_pairs.dup
where k.id = merge_pairs.keep;--> statement-breakpoint
update events e set place_id = merge_pairs.keep from merge_pairs where e.place_id = merge_pairs.dup;--> statement-breakpoint
update providers p set place_id = merge_pairs.keep from merge_pairs where p.place_id = merge_pairs.dup;--> statement-breakpoint
update source_records s set place_id = merge_pairs.keep from merge_pairs where s.place_id = merge_pairs.dup;--> statement-breakpoint
update claims c set listing_id = merge_pairs.keep from merge_pairs where c.listing_id = merge_pairs.dup;--> statement-breakpoint
update listing_changes c set listing_id = merge_pairs.keep from merge_pairs where c.listing_id = merge_pairs.dup and not exists (select 1 from listing_changes x where x.listing_id = merge_pairs.keep and x.kind = c.kind and x.status = 'pending' and c.status = 'pending');--> statement-breakpoint
update places d set slug = d.slug || '-merged', former_slugs = '{}', review = 'rejected', inclusion = 'excluded', inclusion_note = 'Merged into ' || k.name, business_id = null, updated_at = now()
from merge_pairs join places k on k.id = merge_pairs.keep where d.id = merge_pairs.dup;--> statement-breakpoint
DROP TABLE merge_pairs;
