/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import ErrorMessage from "../constants/ErrorMessage.js";
import ReturnCode from "../constants/ReturnCode.js";
import { SponsorshipPolicyDto } from "../types/sponsorship-policy-dto.js";

interface RouteParams {
  id: string;
}

const sponsorshipPolicyRoutes: FastifyPluginAsync = async (server) => {

  server.get("/getPolicies", async function (request, reply) {
    try {
      const result = await server.sponsorshipPolicyRepository.findAll();

      if (!result) {
        return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.FAILED_TO_QUERY_SPONSORSHIP_POLICY });
      }

      return reply.code(ReturnCode.SUCCESS).send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(ReturnCode.FAILURE).send({ error: err.message ?? ErrorMessage.FAILED_TO_QUERY_SPONSORSHIP_POLICY });
    }
  })

  server.post("/addPolicy", async function (request, reply) {
    try {
      // parse the request body as JSON
      const sponsorshipPolicyDto: SponsorshipPolicyDto = JSON.parse(JSON.stringify(request.body)) as SponsorshipPolicyDto;
      if (!sponsorshipPolicyDto) return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.EMPTY_BODY });

      // id is to be null 
      if (sponsorshipPolicyDto.id || sponsorshipPolicyDto.id as number > 0 ||
        !sponsorshipPolicyDto.walletAddress ||
        !sponsorshipPolicyDto.name) {
        return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.INVALID_SPONSORSHIP_POLICY });
      }

      // verify if api key exists for the given wallet address
      const apiKey = await server.apiKeyRepository.findOneByWalletAddress(sponsorshipPolicyDto.walletAddress);

      if (!apiKey) {
        return reply.code(ReturnCode.FAILURE).send({
          error: ErrorMessage.API_KEY_DOES_NOT_EXIST_FOR_THE_WALLET_ADDRESS
        });
      }

      const result = await server.sponsorshipPolicyRepository.createSponsorshipPolicy(sponsorshipPolicyDto);
      if (!result) {
        return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.FAILED_TO_CREATE_SPONSORSHIP_POLICY });
      }

      return reply.code(ReturnCode.SUCCESS).send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(ReturnCode.FAILURE).send({ error: err.message ?? ErrorMessage.FAILED_TO_CREATE_SPONSORSHIP_POLICY });
    }
  })


  server.delete<{ Params: RouteParams }>("/deletePolicy/:id", async (request, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.code(400).send({ error: ErrorMessage.INVALID_SPONSORSHIP_POLICY_ID });
      }

      const result = await server.sponsorshipPolicyRepository.deleteSponsorshipPolicy(id);
      return reply.code(200).send({ message: `Successfully deleted policy with id ${id}` });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: ErrorMessage.FAILED_TO_DELETE_SPONSORSHIP_POLICY });
    }
  });


  server.put<{ Body: SponsorshipPolicyDto }>("/updatePolicy", async (request, reply) => {
    try {
      const sponsorshipPolicyDto: SponsorshipPolicyDto = JSON.parse(JSON.stringify(request.body)) as SponsorshipPolicyDto;
      const id = sponsorshipPolicyDto.id;

      if (!id || isNaN(id)) {
        return reply.code(ReturnCode.BAD_REQUEST).send({ error: ErrorMessage.INVALID_SPONSORSHIP_POLICY_ID });
      }

      const existingSponsorshipPolicy = await server.sponsorshipPolicyRepository.findOneById(id);
      if (!existingSponsorshipPolicy) {
        return reply.code(ReturnCode.NOT_FOUND).send({ error: ErrorMessage.SPONSORSHIP_POLICY_NOT_FOUND });
      }

      // cannot update a disabled policy
      if (!existingSponsorshipPolicy.isEnabled) {
        return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.SPONSORSHIP_POLICY_IS_DISABLED });
      }

      const updatedPolicy = await server.sponsorshipPolicyRepository.updateSponsorshipPolicy(sponsorshipPolicyDto);
      return reply.code(ReturnCode.SUCCESS).send(updatedPolicy);
    } catch (err) {
      request.log.error(err);
      return reply.code(ReturnCode.FAILURE).send({ error: ErrorMessage.FAILED_TO_UPDATE_SPONSORSHIP_POLICY });
    }
  });



};

export default sponsorshipPolicyRoutes;
